import { NextRequest, NextResponse } from 'next/server';
import { unzipSync } from 'fflate';
import { deleteCachedPrefix } from '@/lib/cache';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { getHlsAssetKey, getHlsContentType } from '@/lib/hls';
import { deleteObject, getHlsBucket, getObjectBuffer, putObject } from '@/lib/r2';
import { getPlaybackUrl } from '@/lib/video-processing';
import { getProcessingVideo } from '../../../helpers';

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function isUnsafePath(path: string) {
  return path.split('/').some((segment) => segment === '..') || path.startsWith('__MACOSX/');
}

function stripCommonRoot(entries: Map<string, Uint8Array>) {
  const keys = [...entries.keys()];
  const roots = new Set(keys.filter((key) => key.includes('/')).map((key) => key.split('/')[0]));
  if (roots.size !== 1 || keys.some((key) => !key.includes('/'))) return entries;

  const root = [...roots][0];
  const stripped = new Map<string, Uint8Array>();
  for (const [key, value] of entries.entries()) {
    stripped.set(key.slice(root.length + 1), value);
  }
  return stripped;
}

function readText(data: Uint8Array) {
  return new TextDecoder().decode(data);
}

function playlistUris(playlist: string) {
  return playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^https?:\/\//i.test(line));
}

function resolveRelative(baseFile: string, target: string) {
  const parts = baseFile.includes('/') ? baseFile.split('/').slice(0, -1) : [];
  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join('/');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const key = typeof body?.key === 'string' ? body.key.trim() : '';

  if (!key) {
    return NextResponse.json({ error: 'Missing uploaded zip key.' }, { status: 400 });
  }

  const bucket = getHlsBucket();

  let buffer: Buffer;
  try {
    const fetched = await getObjectBuffer(key, bucket);
    buffer = fetched.buffer;
  } catch (err) {
    return NextResponse.json({ error: 'Unable to retrieve uploaded HLS zip from storage.' }, { status: 400 });
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(new Uint8Array(buffer));
  } catch {
    return NextResponse.json({ error: 'The ZIP file could not be extracted.' }, { status: 400 });
  }

  const rawEntries = new Map<string, Uint8Array>();
  for (const [rawPath, data] of Object.entries(unzipped)) {
    const normalized = normalizeZipPath(rawPath);
    if (!normalized || normalized.endsWith('/') || isUnsafePath(normalized)) continue;
    rawEntries.set(normalized, data);
  }

  const entries = stripCommonRoot(rawEntries);
  if (!entries.has('master.m3u8')) {
    return NextResponse.json({ error: 'The extracted HLS folder must contain master.m3u8 at its root.' }, { status: 400 });
  }

  const masterPlaylist = readText(entries.get('master.m3u8')!);
  const variants = playlistUris(masterPlaylist).filter((uri) => uri.toLowerCase().endsWith('.m3u8'));
  if (!variants.length) {
    return NextResponse.json({ error: 'master.m3u8 must reference variant playlists.' }, { status: 400 });
  }

  let segmentCount = 0;
  for (const variant of variants) {
    const variantPath = resolveRelative('master.m3u8', variant);
    const variantData = entries.get(variantPath);
    if (!variantData) {
      return NextResponse.json({ error: `Variant playlist ${variant} is missing from the ZIP.` }, { status: 400 });
    }

    const segmentRefs = playlistUris(readText(variantData)).filter((uri) => !uri.toLowerCase().endsWith('.m3u8'));
    if (!segmentRefs.length) {
      return NextResponse.json({ error: `Variant playlist ${variant} has no segment files.` }, { status: 400 });
    }

    for (const segment of segmentRefs) {
      const segmentPath = resolveRelative(variantPath, segment);
      if (!entries.has(segmentPath)) {
        return NextResponse.json({ error: `Segment ${segment} referenced by ${variant} is missing.` }, { status: 400 });
      }
      segmentCount += 1;
    }
  }

  if (!segmentCount) {
    return NextResponse.json({ error: 'The HLS package does not contain media segments.' }, { status: 400 });
  }

  await deleteCachedPrefix(`movies/${params.id}`);
  for (const [relativePath, data] of entries.entries()) {
    await putObject(getHlsAssetKey(params.id, relativePath), data, getHlsContentType(relativePath), bucket);
  }

  await deleteObject(key, bucket).catch(() => null);

  const playbackUrl = getPlaybackUrl(params.id);
  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      processingStatus: 'HLS_UPLOADED',
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      hlsPlaybackUrl: playbackUrl,
      playbackUrl
    },
    update: {
      processingStatus: 'HLS_UPLOADED',
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      hlsPlaybackUrl: playbackUrl,
      playbackUrl
    }
  });

  const nextStatus = ['APPROVED', 'PUBLISHED'].includes(video.status) ? video.status : 'HLS_UPLOADED';
  await prisma.video.update({
    where: { id: params.id },
    data: {
      hlsUrl: playbackUrl,
      hlsVersion: 'hls-v1',
      qualities: variants
        .map((variant) => variant.split('/')[0])
        .filter((quality, index, values) => quality && values.indexOf(quality) === index),
      status: nextStatus
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message: 'HLS package uploaded and verified.',
    video: await getProcessingVideo(params.id)
  });
}
