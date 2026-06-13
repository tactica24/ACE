import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getBunnyStreamThumbnailUrl } from '@/lib/bunny-stream';
import { headObject, createSignedStorageUrl } from '@/lib/bunny-storage';
import { prisma } from '@/lib/db';
import { resolveMoviePosterKeyFromCandidates } from '@/lib/movie-assets';
import { isViewerVisibleStatus } from '@/lib/release-status';
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
      await headObject(posterKey);
      const url = await createSignedStorageUrl(posterKey, {
        expiresIn: 7200
      });
      return NextResponse.redirect(url);
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

  return NextResponse.json({ error: 'Poster not available.' }, { status: 404 });
}
