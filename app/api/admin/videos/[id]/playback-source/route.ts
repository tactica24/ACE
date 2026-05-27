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

  if (!['mp4', 'hls'].includes(mode)) {
    return NextResponse.json({ error: 'Choose a valid playback source.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      r2Key: true,
      fallbackR2Key: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          hlsPlaybackUrl: true
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
  const hlsAvailable = Boolean(video.technicalMetadata?.hlsPlaybackUrl?.trim());

  if (mode === 'mp4' && !mp4Available) {
    return NextResponse.json({ error: 'Upload a playable MP4 master before switching this title to MP4 playback.' }, { status: 400 });
  }

  if (mode === 'hls' && !hlsAvailable) {
    return NextResponse.json({ error: 'Upload and validate HLS before switching this title to HLS playback.' }, { status: 400 });
  }

  const playbackUrl = mode === 'hls'
    ? video.technicalMetadata?.hlsPlaybackUrl?.trim() || null
    : null;

  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      playbackUrl
    },
    update: {
      playbackUrl
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message: mode === 'hls' ? 'Playback source switched to HLS.' : 'Playback source switched to MP4.',
    video: await getProcessingVideo(params.id)
  });
}
