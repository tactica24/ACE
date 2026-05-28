import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMovieMp4StorageStatus } from '@/lib/movie-storage';
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
          masterKey: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const mp4Status = await getMovieMp4StorageStatus(video);
  const passed = Boolean(mp4Status.selectedKey);
  const errors = passed
    ? []
    : [
        mp4Status.candidates.length
          ? 'The listed MP4 key was not found in the active R2 bucket.'
          : 'No playable MP4 key is attached to this title.'
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
    mp4Key: mp4Status.selectedKey,
    checks: {
      storageConfigured: mp4Status.storageConfigured,
      candidates: mp4Status.candidates,
      selectedKey: mp4Status.selectedKey
    },
    passed,
    errors,
    video: await getProcessingVideo(movieId)
  });
}
