import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { getProcessingVideo } from '../../helpers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';

  if (mode !== 'mp4') {
    return NextResponse.json({ error: 'MP4 is the only active playback source.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      id: true,
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

  const mp4Available = Boolean(
    video.technicalMetadata?.masterKey?.trim() ||
    video.r2Key?.trim() ||
    video.fallbackR2Key?.trim()
  );

  if (!mp4Available) {
    return NextResponse.json({ error: 'Upload a playable MP4 file before activating playback.' }, { status: 400 });
  }

  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      processingStatus: 'READY_TO_STREAM',
      readyToStreamAt: new Date()
    },
    update: {
      processingStatus: 'READY_TO_STREAM',
      readyToStreamAt: new Date()
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message: 'MP4 playback is active.',
    video: await getProcessingVideo(params.id)
  });
}
