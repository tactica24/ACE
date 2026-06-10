import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { resolveVideoHlsManifestKey } from '@/lib/hls';
import { getProcessingVideo } from '../../helpers';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = typeof body.mode === 'string' ? body.mode.trim().toLowerCase() : '';

  if (mode !== 'hls') {
    return NextResponse.json({ error: 'HLS is the active viewer playback source.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      technicalMetadata: {
        select: {
          hlsManifestKey: true,
          hlsOutputPath: true,
          hlsReadyAt: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const hlsManifestKey = resolveVideoHlsManifestKey(video);
  if (!hlsManifestKey || !video.technicalMetadata?.hlsReadyAt) {
    return NextResponse.json({ error: 'Bunny playback is not ready for this title yet.' }, { status: 400 });
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
    message: 'HLS playback is active.',
    video: await getProcessingVideo(params.id)
  });
}
