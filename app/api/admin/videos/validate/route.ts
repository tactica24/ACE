import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPlaybackAssetSnapshot } from '@/lib/playback-assets';
import { getPlayableProgressiveKey, getPlayableProgressiveUrl } from '@/lib/playback-delivery';
import { getProcessingVideo } from '../helpers';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const movieId = typeof body.movieId === 'string' ? body.movieId.trim() : '';
  if (!movieId) {
    return NextResponse.json({ error: 'movieId required' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      status: true,
      r2Key: true,
      fallbackR2Key: true,
      technicalMetadata: {
        select: {
          playbackUrl: true,
          masterKey: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const progressiveKey = getPlayableProgressiveKey(video);
  const progressiveUrl = getPlayableProgressiveUrl(video);
  const snapshot = await getPlaybackAssetSnapshot(
    video.id,
    video.r2Key,
    video.fallbackR2Key,
    video.technicalMetadata?.masterKey
  );

  const passed = snapshot.ready || Boolean(progressiveKey || progressiveUrl);
  const errors = passed
    ? []
    : [
        snapshot.storageConfigured
          ? 'No MP4 object was found in R2 for this title.'
          : 'R2 storage is not configured for MP4 validation.'
      ];

  if (passed) {
    await prisma.$transaction([
      prisma.video.update({
        where: { id: movieId },
        data: {
          status: ['APPROVED', 'PUBLISHED'].includes(video.status) ? video.status : 'READY'
        }
      }),
      prisma.videoTechnicalMetadata.upsert({
        where: { videoId: movieId },
        create: {
          videoId: movieId,
          processingStatus: 'READY_TO_STREAM',
          readyToStreamAt: new Date()
        },
        update: {
          processingStatus: 'READY_TO_STREAM',
          readyToStreamAt: new Date()
        }
      })
    ]);
  }

  return NextResponse.json({
    movieId,
    title: video.title,
    mp4Key: progressiveKey,
    mp4Url: progressiveUrl,
    checks: {
      storageConfigured: snapshot.storageConfigured,
      primaryReady: snapshot.progressiveReady,
      fallbackReady: snapshot.fallbackProgressiveReady,
      masterReady: snapshot.masterProgressiveReady
    },
    passed,
    errors,
    video: await getProcessingVideo(movieId)
  });
}
