import { NextRequest, NextResponse } from 'next/server';
import { deleteCachedPrefix } from '@/lib/cache';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getHlsContentType } from '@/lib/hls';
import { getHlsBucket, putObject } from '@/lib/r2';
import { getPlaybackUrl } from '@/lib/video-processing';
import { unzipSync } from 'fflate';

function normalizeZipKey(rawKey: string) {
  return rawKey.replace(/\\/g, '/').replace(/^\.?\//, '').replace(/\/+$|^\/+/, '');
}

function resolveRelativePath(basePath: string, relativePath: string) {
  const baseParts = basePath.includes('/') ? basePath.split('/').slice(0, -1) : [];
  const relativeParts = relativePath.split('/');
  const resolved: string[] = [...baseParts];

  for (const segment of relativeParts) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.join('/');
}

function getCommonRootFolder(keys: string[]) {
  const folders = new Set(keys.filter((key) => key.includes('/')).map((key) => key.split('/')[0]));
  if (folders.size === 1) {
    return [...folders][0];
  }
  return '';
}

function parsePlaylistReferences(playlistContent: string) {
  const lines = playlistContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const references: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      const next = lines[i + 1];
      if (next && !next.startsWith('#')) {
        references.push(next.trim());
      }
    }
  }

  return references;
}

function parseSegmentRefs(playlistContent: string) {
  return playlistContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('hlsZip');
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: { id: true, status: true }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'HLS ZIP package is required.' }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.zip')) {
    return NextResponse.json({ error: 'Upload a .zip archive containing the HLS package.' }, { status: 400 });
  }

  const zipBuffer = await file.arrayBuffer();
  const zipContents = unzipSync(new Uint8Array(zipBuffer));
  const rawKeys = Object.keys(zipContents).map(normalizeZipKey).filter(Boolean);
  if (!rawKeys.length) {
    return NextResponse.json({ error: 'The ZIP package is empty or invalid.' }, { status: 400 });
  }

  const rootFolder = getCommonRootFolder(rawKeys);
  const entries = new Map<string, Uint8Array>();
  for (const rawKey of rawKeys) {
    const normalizedKey = rawKey.startsWith(`${rootFolder}/`) ? rawKey.slice(rootFolder.length + 1) : rawKey;
    if (!normalizedKey || normalizedKey.endsWith('/')) {
      continue;
    }
    entries.set(normalizedKey, zipContents[rawKey]);
  }

  if (!entries.has('master.m3u8')) {
    return NextResponse.json({ error: 'The HLS package must include a root master.m3u8 playlist.' }, { status: 400 });
  }

  const masterContent = new TextDecoder().decode(entries.get('master.m3u8')!);
  const variantPlaylists = parsePlaylistReferences(masterContent);
  if (!variantPlaylists.length) {
    return NextResponse.json({ error: 'The master playlist must reference at least one variant playlist.' }, { status: 400 });
  }

  for (const variantPath of variantPlaylists) {
    const resolvedVariantPath = resolveRelativePath('master.m3u8', variantPath);
    if (!entries.has(resolvedVariantPath)) {
      return NextResponse.json({ error: `Variant playlist ${variantPath} is missing from the ZIP package.` }, { status: 400 });
    }

    const variantContent = new TextDecoder().decode(entries.get(resolvedVariantPath)!);
    const segmentRefs = parseSegmentRefs(variantContent);
    if (!segmentRefs.length) {
      return NextResponse.json({ error: `Variant playlist ${variantPath} has no media segments.` }, { status: 400 });
    }

    for (const segmentRef of segmentRefs) {
      const resolvedSegmentPath = resolveRelativePath(resolvedVariantPath, segmentRef);
      if (!entries.has(resolvedSegmentPath)) {
        return NextResponse.json({ error: `Media segment ${segmentRef} referenced by ${variantPath} is missing from the ZIP package.` }, { status: 400 });
      }
    }
  }

  const bucket = getHlsBucket();
  const basePath = `movies/${params.id}`;
  await deleteCachedPrefix(basePath);

  for (const [relativePath, data] of entries.entries()) {
    const key = `${basePath}/${relativePath}`;
    await putObject(key, Buffer.from(data), getHlsContentType(relativePath), bucket);
  }

  const playbackUrl = getPlaybackUrl(params.id);
  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      playbackUrl,
      hlsPlaybackUrl: playbackUrl,
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      processingStatus: 'READY_TO_STREAM'
    },
    update: {
      playbackUrl,
      hlsPlaybackUrl: playbackUrl,
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      processingStatus: 'READY_TO_STREAM'
    }
  });

  const nextStatus = ['APPROVED', 'PUBLISHED'].includes(video.status) ? video.status : 'HLS_UPLOADED';
  await prisma.video.update({
    where: { id: params.id },
    data: {
      hlsUrl: playbackUrl,
      hlsVersion: 'hls-v1',
      qualities: variantPlaylists
        .map((variant) => variant.split('/')[0])
        .filter((quality, index, values) => quality && values.indexOf(quality) === index),
      status: nextStatus
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({ ok: true, hlsPlaybackUrl: playbackUrl });
}
