import { NextRequest, NextResponse } from 'next/server';
import { getBunnyStreamHlsUrl, mapBunnyStreamStatus, verifyBunnyStreamWebhookSignature } from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BunnyStreamWebhookBody = {
  VideoLibraryId?: number | string;
  VideoGuid?: string;
  Status?: number | string;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-bunnystream-signature');
  const version = req.headers.get('x-bunnystream-signature-version');
  const algorithm = req.headers.get('x-bunnystream-signature-algorithm');

  if (version !== 'v1' || algorithm !== 'hmac-sha256' || !verifyBunnyStreamWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = JSON.parse(rawBody || '{}') as BunnyStreamWebhookBody;
  const videoGuid = typeof body.VideoGuid === 'string' ? body.VideoGuid.trim() : '';
  const status = mapBunnyStreamStatus(body.Status);

  if (!videoGuid) {
    return NextResponse.json({ error: 'VideoGuid is required.' }, { status: 400 });
  }

  const match = await prisma.videoTechnicalMetadata.findFirst({
    where: {
      OR: [
        { bunnyStreamVideoId: videoGuid },
        { trailerStreamVideoId: videoGuid }
      ]
    },
    select: {
      videoId: true,
      bunnyStreamVideoId: true,
      trailerStreamVideoId: true,
      video: {
        select: {
          status: true
        }
      }
    }
  });

  if (!match) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const isMovie = match.bunnyStreamVideoId === videoGuid;

  if (isMovie) {
    const isReady = status === 'ready';
    const isFailed = status === 'failed';
    await prisma.$transaction([
      prisma.video.update({
        where: { id: match.videoId },
        data: {
          status: isReady ? 'READY' : isFailed ? 'PROCESSING' : 'PROCESSING'
        }
      }),
      prisma.videoTechnicalMetadata.update({
        where: { videoId: match.videoId },
        data: {
          bunnyStreamStatus: status,
          bunnyStreamReadyAt: isReady ? new Date() : null,
          bunnyStreamError: isFailed ? 'Bunny Stream processing failed.' : null,
          processingStatus: isReady ? 'READY_TO_STREAM' : isFailed ? 'TRANSCODE_FAILED' : 'ENCODING_STARTED',
          readyToStreamAt: isReady ? new Date() : null,
          hlsReadyAt: isReady ? new Date() : null,
          playbackUrl: isReady ? getBunnyStreamHlsUrl(videoGuid) : null,
          transcodeError: isFailed ? 'Bunny Stream processing failed.' : null,
          transcodeFailedAt: isFailed ? new Date() : null
        }
      })
    ]);
  } else {
    const isReady = status === 'ready';
    const isFailed = status === 'failed';
    await prisma.videoTechnicalMetadata.update({
      where: { videoId: match.videoId },
      data: {
        trailerStreamStatus: status,
        trailerStreamReadyAt: isReady ? new Date() : null,
        trailerStreamError: isFailed ? 'Bunny Stream trailer processing failed.' : null
      }
    });
  }

  return NextResponse.json({ ok: true });
}
