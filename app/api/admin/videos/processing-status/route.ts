import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getProcessingVideo } from '../helpers';

const STATUS_UPDATES: Record<string, { status: string }> = {
  PROCESSING: { status: 'PROCESSING' },
  READY: { status: 'READY' },
  PUBLISH: { status: 'PUBLISHED' }
};

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  if (!videoId || !action) {
    return NextResponse.json({ error: 'Movie and action are required.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      status: true,
      hlsUrl: true,
      technicalMetadata: {
        select: {
          playbackUrl: true,
          processingStatus: true
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
        hlsUrl: true,
        technicalMetadata: {
          select: {
            playbackUrl: true,
            processingStatus: true
          }
        }
      }
    });

    if (
      videoForPublish?.status !== 'READY' ||
      videoForPublish.technicalMetadata?.processingStatus !== 'READY_TO_STREAM' ||
      !(videoForPublish.technicalMetadata?.playbackUrl || videoForPublish.hlsUrl)
    ) {
      return NextResponse.json({ error: 'Validate HLS and mark ready before publishing.' }, { status: 400 });
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
}
