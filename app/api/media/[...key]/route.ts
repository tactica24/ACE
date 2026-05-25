import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPresignedGetUrl } from '@/lib/r2';
import { streamR2Object } from '@/lib/stream';
import { getBucketForStorageKey } from '@/lib/r2';
import { canPreviewVideo } from '@/lib/video-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { key?: string[] } }) {
  const key = params.key?.join('/');
  if (!key) {
    return NextResponse.json({ error: 'Missing asset key' }, { status: 400 });
  }

  try {
    const auth = await getAuthFromRequest(req);
    const video = await prisma.video.findFirst({
      where: {
        OR: [
          { posterKey: key },
          { subtitleTracks: { some: { fileKey: key } } },
          { technicalMetadata: { is: { landscapeArtworkKey: key } } },
          { technicalMetadata: { is: { trailerKey: key } } },
          { technicalMetadata: { is: { promotionalStillKeys: { has: key } } } }
        ]
      },
      select: {
        creatorId: true,
        status: true,
        videoType: true,
        seriesId: true,
        r2Key: true,
        posterKey: true,
        subtitleTracks: {
          select: {
            fileKey: true
          }
        },
        technicalMetadata: {
          select: {
            trailerKey: true
          }
        }
      }
    });

    if (!video) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
    }

    if (!['APPROVED', 'PUBLISHED'].includes(video.status) && !canPreviewVideo(video, auth)) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 403 });
    }

    const isTrailerAsset = video.technicalMetadata?.trailerKey?.trim() === key;
    const isSubtitleAsset = video.subtitleTracks.some((track) => track.fileKey === key);

    if (isTrailerAsset || isSubtitleAsset) {
      const rangeHeader = req.headers.get('range');
      const bucket = getBucketForStorageKey(key);
      const result = await streamR2Object(key, rangeHeader, undefined, bucket);

      return new Response(Readable.toWeb(result.stream) as never, {
        status: result.status,
        headers: result.headers
      });
    }

    const url = await createPresignedGetUrl(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
  }
}
