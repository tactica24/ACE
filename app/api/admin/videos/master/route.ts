import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { isOwnedUploadKey } from '@/lib/upload-security';
import { getProcessingVideo } from '../helpers';

function hasSupportedMasterExtension(key: string) {
  return /\.mp4$/i.test(key);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const fileSize = Number.isFinite(body.fileSize) ? Math.max(0, Math.floor(body.fileSize)) : null;
  const masterFileSize = fileSize === null ? null : BigInt(fileSize);

  if (!videoId || !key || !fileName || fileSize === null) {
    return NextResponse.json({ error: 'Movie, master key, file name, and file size are required.' }, { status: 400 });
  }

  if (!hasSupportedMasterExtension(key) || !isOwnedUploadKey(key, auth.sub, 'master')) {
    return NextResponse.json({ error: 'Upload a valid MP4 master that belongs to this admin account.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.videoTechnicalMetadata.upsert({
      where: { videoId },
      create: {
        videoId,
        masterKey: key,
        masterFileName: fileName,
        masterFileSize,
        masterUploadedAt: new Date(),
        playbackUrl: null,
        processingStatus: 'MASTER_UPLOADED',
        orchestrationProvider: null,
        orchestrationJobId: null,
        transcodeProvider: null,
        transcodeTaskId: null,
        transcodeRequestedAt: null,
        transcodeFailedAt: null,
        transcodeError: null,
        hlsManifestKey: null,
        hlsOutputPath: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false,
        masterDeletedAt: null
      },
      update: {
        masterKey: key,
        masterFileName: fileName,
        masterFileSize,
        masterUploadedAt: new Date(),
        playbackUrl: null,
        processingStatus: 'MASTER_UPLOADED',
        orchestrationProvider: null,
        orchestrationJobId: null,
        transcodeProvider: null,
        transcodeTaskId: null,
        transcodeRequestedAt: null,
        transcodeFailedAt: null,
        transcodeError: null,
        hlsManifestKey: null,
        hlsOutputPath: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false,
        masterDeletedAt: null
      }
    }),
    prisma.video.update({
      where: { id: videoId },
      data: { status: 'MASTER_UPLOADED' }
    })
  ]);

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    message: 'MP4 master uploaded into the Bunny movie folder and attached. Start Contabo HLS when you are ready to process this movie.',
    video: await getProcessingVideo(videoId)
  });
}
