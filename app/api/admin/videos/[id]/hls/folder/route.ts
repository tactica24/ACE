import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { deleteCachedPrefix } from '@/lib/cache';
import { copyObject, getHlsBucket, getObjectBuffer, getObjectMetadata } from '@/lib/r2';
import { getPlaybackUrl } from '@/lib/video-processing';
import { getProcessingVideo } from '../../../helpers';

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function isUnsafePath(path: string) {
  return path.split('/').some((segment) => segment === '..') || path.startsWith('__MACOSX/');
}

function readText(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

function playlistUris(playlist: string): string[] {
  return playlist
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^https?:\/\//i.test(line));
}

function resolveRelative(baseFile: string, target: string): string {
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

async function normalizeCommonRootUpload({
  bucket,
  basePrefix,
  normalizedPaths,
  root
}: {
  bucket: string;
  basePrefix: string;
  normalizedPaths: string[];
  root: string;
}) {
  const rootPrefix = `${root}/`;
  await Promise.all(
    normalizedPaths
      .filter((path) => path.startsWith(rootPrefix))
      .map((path) =>
        copyObject(
          `${basePrefix}${path}`,
          `${basePrefix}${path.slice(rootPrefix.length)}`,
          bucket,
          bucket
        )
      )
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      technicalMetadata: {
        select: {
          playbackUrl: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const relativePaths: string[] = Array.isArray(body?.relativePaths) ? body.relativePaths : [];

  if (relativePaths.length === 0) {
    return NextResponse.json({ error: 'No files provided for HLS folder.' }, { status: 400 });
  }

  const normalizedPaths = relativePaths.map(normalizePath).filter((p) => p && !isUnsafePath(p));
  const entries = new Set(normalizedPaths);

  const bucket = getHlsBucket();
  const basePrefix = `movies/${params.id}/`;

  // Find master.m3u8 (support common root folder)
  let masterRelative = 'master.m3u8';
  if (!entries.has(masterRelative)) {
    // Try to find if everything is under one root folder
    const roots = new Set(
      normalizedPaths
        .filter((p) => p.includes('/'))
        .map((p) => p.split('/')[0])
    );
    if (roots.size === 1) {
      const root = [...roots][0];
      const candidate = `${root}/master.m3u8`;
      if (entries.has(candidate)) {
        try {
          await deleteCachedPrefix(`movies/${params.id}`);
          await normalizeCommonRootUpload({ bucket, basePrefix, normalizedPaths, root });
          const strippedPaths = normalizedPaths
            .filter((path) => path.startsWith(`${root}/`))
            .map((path) => path.slice(root.length + 1));
          entries.clear();
          strippedPaths.forEach((path) => entries.add(path));
          masterRelative = 'master.m3u8';
        } catch (error) {
          console.error('[hls-folder] failed to normalize common root upload', error);
          return NextResponse.json({ error: 'Unable to prepare nested HLS folder for playback.' }, { status: 500 });
        }
      }
    }
  }

  if (!entries.has(masterRelative)) {
    return NextResponse.json({ error: 'The HLS folder must contain master.m3u8 (at root or under single common folder).' }, { status: 400 });
  }

  // Read and validate master playlist
  const masterKey = `${basePrefix}${masterRelative}`;
  let masterPlaylist: string;
  try {
    const { buffer } = await getObjectBuffer(masterKey, bucket);
    masterPlaylist = readText(buffer);
  } catch {
    return NextResponse.json({ error: 'Could not read master.m3u8 from uploaded files.' }, { status: 400 });
  }

  const variants = playlistUris(masterPlaylist).filter((uri) => uri.toLowerCase().endsWith('.m3u8'));
  if (variants.length === 0) {
    return NextResponse.json({ error: 'master.m3u8 must reference at least one variant playlist.' }, { status: 400 });
  }

  let segmentCount = 0;
  const qualities: string[] = [];

  for (const variant of variants) {
    const variantRelative = resolveRelative(masterRelative, variant);
    const variantKey = `${basePrefix}${variantRelative}`;

    if (!entries.has(variantRelative)) {
      return NextResponse.json({ error: `Variant playlist ${variant} is missing from the uploaded folder.` }, { status: 400 });
    }

    let variantContent: string;
    try {
      const { buffer } = await getObjectBuffer(variantKey, bucket);
      variantContent = readText(buffer);
    } catch {
      return NextResponse.json({ error: `Could not read variant playlist ${variant}.` }, { status: 400 });
    }

    const segmentRefs = playlistUris(variantContent).filter((uri) => !uri.toLowerCase().endsWith('.m3u8'));
    if (segmentRefs.length === 0) {
      return NextResponse.json({ error: `Variant playlist ${variant} has no segments.` }, { status: 400 });
    }

    for (const segment of segmentRefs) {
      const segmentRelative = resolveRelative(variantRelative, segment);
      const segmentKey = `${basePrefix}${segmentRelative}`;

      if (!entries.has(segmentRelative)) {
        return NextResponse.json({ error: `Segment ${segment} referenced by ${variant} is missing.` }, { status: 400 });
      }

      // Verify the segment actually exists in storage (cheap HEAD)
      try {
        await getObjectMetadata(segmentKey, bucket);
      } catch {
        return NextResponse.json({ error: `Segment file ${segment} is missing from storage.` }, { status: 400 });
      }

      segmentCount += 1;
    }

    // Derive quality name from folder (e.g. "1080p", "720p")
    const quality = variantRelative.split('/')[0];
    if (quality && !qualities.includes(quality)) {
      qualities.push(quality);
    }
  }

  if (segmentCount === 0) {
    return NextResponse.json({ error: 'The HLS folder does not contain any media segments.' }, { status: 400 });
  }

  const playbackUrl = getPlaybackUrl(params.id);

  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      processingStatus: 'HLS_UPLOADED',
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      hlsPlaybackUrl: playbackUrl,
      playbackUrl: video.technicalMetadata?.playbackUrl?.trim() || null
    },
    update: {
      processingStatus: 'HLS_UPLOADED',
      hlsUploadedAt: new Date(),
      hlsVerifiedAt: new Date(),
      hlsPlaybackUrl: playbackUrl,
      playbackUrl: video.technicalMetadata?.playbackUrl?.trim() || null
    }
  });

  const nextStatus = ['APPROVED', 'PUBLISHED'].includes(video.status) ? video.status : 'HLS_UPLOADED';

  await prisma.video.update({
    where: { id: params.id },
    data: {
      hlsUrl: playbackUrl,
      hlsVersion: 'hls-v1',
      qualities,
      status: nextStatus
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message: 'HLS folder uploaded and fully validated.',
    video: await getProcessingVideo(params.id)
  });
}
