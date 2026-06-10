import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getBunnyStreamHlsUrl, getBunnyStreamVideo } from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
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
            masterSourceUrl: true,
            bunnyStreamLibraryId: true,
            bunnyStreamVideoId: true
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
              hlsReadyAt: true,
              bunnyStreamVideoId: true,
              bunnyStreamReadyAt: true
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
        return NextResponse.json({ error: 'Wait for Bunny playback readiness before publishing this title.' }, { status: 400 });
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

    if (action === 'START_PIPELINE' || action === 'SYNC_PIPELINE') {
      return NextResponse.json({
        error: 'The legacy processing pipeline has been retired. Use the Bunny upload desk and Bunny status sync instead.'
      }, { status: 410 });
    }

    if (action === 'SYNC_STREAM') {
      const streamVideoId = video.technicalMetadata?.bunnyStreamVideoId?.trim() ?? '';
      const libraryId = video.technicalMetadata?.bunnyStreamLibraryId?.trim() || undefined;

      if (!streamVideoId) {
        return NextResponse.json({
          error: 'This title has not been uploaded to Bunny Stream yet. Use the admin upload desk first.'
        }, { status: 400 });
      }

      const stream = await getBunnyStreamVideo(streamVideoId, libraryId);
      const isReady = stream.status === 'ready';
      const isFailed = stream.status === 'failed';
      const statusMessage = stream.transcodingMessages[0] ?? (isFailed ? 'Bunny Stream processing failed.' : null);

      await prisma.$transaction([
        prisma.video.update({
          where: { id: videoId },
          data: {
            status: isReady ? 'READY' : 'PROCESSING',
            ...(stream.length && stream.length > 0 ? { durationSec: stream.length } : {}),
            ...(stream.availableResolutions.length ? { qualities: stream.availableResolutions } : {})
          }
        }),
        prisma.videoTechnicalMetadata.update({
          where: { videoId },
          data: {
            bunnyStreamStatus: stream.status,
            bunnyStreamReadyAt: isReady ? new Date() : null,
            bunnyStreamError: isFailed ? statusMessage ?? 'Bunny Stream processing failed.' : null,
            processingStatus: isReady ? 'READY_TO_STREAM' : isFailed ? 'TRANSCODE_FAILED' : 'ENCODING_STARTED',
            readyToStreamAt: isReady ? new Date() : null,
            hlsReadyAt: isReady ? new Date() : null,
            playbackUrl: isReady ? getBunnyStreamHlsUrl(stream.videoId) : null,
            transcodeError: isFailed ? statusMessage ?? 'Bunny Stream processing failed.' : null,
            transcodeFailedAt: isFailed ? new Date() : null
          }
        })
      ]);

      return NextResponse.json({
        ok: true,
        message: isReady
          ? 'Bunny Stream is ready for playback.'
          : isFailed
            ? statusMessage ?? 'Bunny Stream reported a processing failure.'
            : `Bunny Stream status synced: ${stream.status}${stream.encodeProgress !== null ? ` (${stream.encodeProgress}%)` : ''}.`,
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
