import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getBunnyStreamThumbnailUrl } from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';
import { resolveMoviePosterKeyFromCandidates } from '@/lib/movie-assets';
import { isViewerVisibleStatus } from '@/lib/release-status';
import { streamStoredObject } from '@/lib/stream';
import { canPreviewVideo } from '@/lib/video-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      creatorId: true,
      status: true,
      posterKey: true,
      technicalMetadata: {
        select: {
          trailerStreamVideoId: true,
          trailerStreamReadyAt: true,
          bunnyStreamVideoId: true,
          bunnyStreamReadyAt: true
        }
      },
      series: {
        select: {
          posterKey: true,
          technicalMetadata: {
            select: {
              trailerStreamVideoId: true,
              trailerStreamReadyAt: true,
              bunnyStreamVideoId: true,
              bunnyStreamReadyAt: true
            }
          }
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Poster not found.' }, { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  const visible = isViewerVisibleStatus(video.status) || canPreviewVideo(video, auth);

  if (!visible) {
    const hasUnlock = auth && await prisma.unlock.findFirst({
      where: { userId: auth.sub, videoId: params.id },
      select: { id: true }
    });
    if (!hasUnlock) {
      return NextResponse.json({ error: 'Poster not available.' }, { status: 403 });
    }
  }

  const posterKey = resolveMoviePosterKeyFromCandidates(video, video.series);
  if (posterKey) {
    try {
      const result = await streamStoredObject(posterKey, req.headers.get('range'));
      return new Response(Readable.toWeb(result.stream) as never, {
        status: result.status,
        headers: {
          ...result.headers,
          'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          Vary: 'Range'
        }
      });
    } catch {
      // Fall through to Bunny Stream thumbnail when the stored poster record points to a missing object.
    }
  }

  const thumbnailVideoId =
    (video.technicalMetadata?.bunnyStreamVideoId && video.technicalMetadata?.bunnyStreamReadyAt
      ? video.technicalMetadata.bunnyStreamVideoId
      : null) ??
    (video.technicalMetadata?.trailerStreamVideoId && video.technicalMetadata?.trailerStreamReadyAt
      ? video.technicalMetadata.trailerStreamVideoId
      : null) ??
    (video.series?.technicalMetadata?.bunnyStreamVideoId && video.series.technicalMetadata?.bunnyStreamReadyAt
      ? video.series.technicalMetadata.bunnyStreamVideoId
      : null) ??
    (video.series?.technicalMetadata?.trailerStreamVideoId && video.series.technicalMetadata?.trailerStreamReadyAt
      ? video.series.technicalMetadata.trailerStreamVideoId
      : null);

  if (thumbnailVideoId) {
    return NextResponse.redirect(getBunnyStreamThumbnailUrl(thumbnailVideoId));
  }

  return NextResponse.redirect(new URL('/default-poster.svg', req.url));
}
