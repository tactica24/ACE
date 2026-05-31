import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
import { isSeriesContainer } from '@/lib/video-access';

const ALLOWED_VIDEO_STATUSES = new Set(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']);

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!videoId || !ALLOWED_VIDEO_STATUSES.has(status)) {
    return NextResponse.json({ error: 'A valid movie and target status are required.' }, { status: 400 });
  }

  const existingVideo = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      status: true,
      creatorId: true,
      videoType: true,
      seriesId: true,
      primaryStorageKey: true,
      fallbackStorageKey: true,
      technicalMetadata: {
        select: {
          masterKey: true
        }
      },
      episodes: {
        select: {
          id: true,
          title: true,
          videoType: true,
          seriesId: true,
          primaryStorageKey: true,
          fallbackStorageKey: true,
          technicalMetadata: {
            select: {
              masterKey: true
            }
          }
        },
        orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }]
      }
    }
  });

  if (!existingVideo) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  if (userId && existingVideo.creatorId !== userId) {
    return NextResponse.json({ error: 'That movie does not belong to the selected producer.' }, { status: 400 });
  }

  if (status === 'APPROVED') {
    const readinessTargets = isSeriesContainer(existingVideo) ? existingVideo.episodes : [existingVideo];

    if (!readinessTargets.length) {
      return NextResponse.json({ error: 'This series cannot go live yet because no viewer-ready episodes are attached.' }, { status: 400 });
    }

    const readiness = readinessTargets.map((video) => ({
      video,
      ready: hasReadyMoviePlayback(video)
    }));
    const notReady = readiness.filter((entry) => !entry.ready).map((entry) => entry.video);
    if (notReady.length) {
      return NextResponse.json({
        error: `Verified playback is still incomplete for: ${notReady.map((video) => video.title).join(', ')}.`
      }, { status: 400 });
    }
  }

  await prisma.video.update({
    where: { id: videoId },
    data: { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' }
  });

  if (existingVideo.videoType === 'SERIES' && !existingVideo.seriesId) {
    await prisma.video.updateMany({
      where: { seriesId: videoId },
      data: { status: status as 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' }
    });
  }

  if (status === 'APPROVED' || status === 'PENDING' || status === 'REJECTED') {
    await prisma.moderationItem.upsert({
      where: { videoId },
      update: {
        status: status as 'APPROVED' | 'PENDING' | 'REJECTED',
        reviewerId: auth.sub
      },
      create: {
        videoId,
        status: status as 'APPROVED' | 'PENDING' | 'REJECTED',
        reviewerId: auth.sub
      }
    });
  }

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message:
      status === 'APPROVED'
        ? 'Movie is now visible to viewers again.'
        : status === 'DRAFT'
          ? 'Movie has been hidden from viewers but kept in the producer library.'
          : `Movie status updated to ${status}.`,
    video: {
      id: existingVideo.id,
      status
    }
  });
}
