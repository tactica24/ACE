import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
import { queueVideoHlsPipeline, syncPipelineTask } from '@/lib/video-pipeline';
import { getProcessingVideo } from '../helpers';

const STATUS_UPDATES: Record<string, { status: string }> = {
  PROCESSING: { status: 'PROCESSING' },
  READY: { status: 'READY' },
  PUBLISH: { status: 'PUBLISHED' }
};

export async function POST(req: NextRequest) {
  let videoId = '';
  let action = '';

  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!videoId || !action) {
      return NextResponse.json({ error: 'Movie and action are required.' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
        primaryStorageKey: true,
        fallbackStorageKey: true,
        technicalMetadata: {
          select: {
            processingStatus: true,
            masterKey: true,
            masterSourceUrl: true
          }
        }
      }
    });

    if (!video) {
      return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
    }

    if (action === 'PUBLISH') {
      const videoForPublish = await prisma.video.findUnique({
        where: { id: videoId },
        select: {
          status: true,
          primaryStorageKey: true,
          fallbackStorageKey: true,
          technicalMetadata: {
            select: {
              processingStatus: true,
              masterKey: true,
              masterSourceUrl: true,
              hlsManifestKey: true,
              hlsOutputPath: true,
              hlsReadyAt: true
            }
          }
        }
      });

      if (
        videoForPublish?.status !== 'READY' ||
        videoForPublish.technicalMetadata?.processingStatus !== 'READY_TO_STREAM' ||
        !videoForPublish ||
        !hasReadyMoviePlayback(videoForPublish)
      ) {
        return NextResponse.json({ error: 'Wait for HLS readiness before publishing this title.' }, { status: 400 });
      }

      await prisma.video.update({
        where: { id: videoId },
        data: {
          status: 'PUBLISHED',
          isPublished: true
        }
      });

      return NextResponse.json({
        ok: true,
        message: 'Movie published and available for streaming.',
        video: await getProcessingVideo(videoId)
      });
    }

    if (action === 'START_PIPELINE') {
      const result = await queueVideoHlsPipeline(videoId);
      return NextResponse.json({
        ok: true,
        message: `Contabo queued the HLS pipeline for this title (${result.jobId}). Bunny stream folders are ready and the admin panel will update after callback.`,
        video: await getProcessingVideo(videoId)
      });
    }

    if (action === 'SYNC_PIPELINE') {
      await syncPipelineTask(videoId);
      return NextResponse.json({
        ok: true,
        message: 'Pipeline status synced from Contabo.',
        video: await getProcessingVideo(videoId)
      });
    }

    const update = STATUS_UPDATES[action];
    if (!update) {
      return NextResponse.json({ error: 'Invalid processing action.' }, { status: 400 });
    }

    await prisma.video.update({
      where: { id: videoId },
      data: { status: update.status as 'PROCESSING' | 'READY' | 'PUBLISHED' }
    });

    return NextResponse.json({
      ok: true,
      message: `Status updated to ${update.status}.`,
      video: await getProcessingVideo(videoId)
    });
  } catch (error) {
    const refreshedVideo = videoId ? await getProcessingVideo(videoId).catch(() => null) : null;
    console.error('[admin/videos/processing-status] failed', {
      videoId,
      action,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unexpected server error while updating the processing status.',
        video: refreshedVideo
      },
      { status: 500 }
    );
  }
}
