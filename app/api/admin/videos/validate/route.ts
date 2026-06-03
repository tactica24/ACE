import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
import { hasVideoMasterSource } from '@/lib/master-source';
import { syncPipelineTask } from '@/lib/video-pipeline';
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
      primaryStorageKey: true,
      fallbackStorageKey: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          masterSourceUrl: true,
          hlsManifestKey: true,
          hlsOutputPath: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  let synced = false;
  if (video.technicalMetadata?.hlsManifestKey || video.technicalMetadata?.hlsOutputPath) {
    await syncPipelineTask(movieId).catch(() => null);
    synced = true;
  }

  const refreshedVideo = await prisma.video.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      status: true,
      primaryStorageKey: true,
      fallbackStorageKey: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          masterSourceUrl: true,
          hlsManifestKey: true,
          hlsOutputPath: true,
          hlsReadyAt: true,
          processingStatus: true
        }
      }
    }
  });

  const passed = Boolean(refreshedVideo && hasReadyMoviePlayback(refreshedVideo));
  const errors = passed
    ? []
    : hasVideoMasterSource(refreshedVideo ?? video)
      ? ['A master source is attached, but no viewer-ready HLS playback is attached to this title yet.']
      : ['No master source or viewer-ready HLS playback is attached to this title yet.'];

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
    synced,
    checks: {
      hlsManifestKey: refreshedVideo?.technicalMetadata?.hlsManifestKey ?? null,
      hlsReadyAt: refreshedVideo?.technicalMetadata?.hlsReadyAt ?? null,
      processingStatus: refreshedVideo?.technicalMetadata?.processingStatus ?? 'NO_MASTER'
    },
    passed,
    errors,
    video: await getProcessingVideo(movieId)
  });
}
