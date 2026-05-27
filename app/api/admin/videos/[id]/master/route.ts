import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPresignedGetUrl, deleteObject, getMasterBucket } from '@/lib/r2';
import { getMasterDownloadFileName } from '@/lib/video-processing';
import { getProcessingVideo } from '../../helpers';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      title: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          masterFileName: true
        }
      }
    }
  });

  if (!video?.technicalMetadata?.masterKey) {
    return NextResponse.json({ error: 'Private master not found.' }, { status: 404 });
  }

  const url = await createPresignedGetUrl(
    video.technicalMetadata.masterKey,
    {
      contentDisposition: `attachment; filename="${getMasterDownloadFileName(video.technicalMetadata.masterFileName, video.title)}"`,
      contentType: 'application/octet-stream'
    },
    getMasterBucket()
  );

  return NextResponse.redirect(url);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      technicalMetadata: {
        select: {
          masterKey: true,
          playbackUrl: true,
          processingStatus: true
        }
      }
    }
  });

  if (!video?.technicalMetadata?.masterKey) {
    return NextResponse.json({ error: 'Private master not found.' }, { status: 404 });
  }

  await deleteObject(video.technicalMetadata.masterKey, getMasterBucket());
  await prisma.videoTechnicalMetadata.update({
    where: { videoId: params.id },
    data: {
      masterKey: null,
      masterFileName: null,
      masterFileSize: null,
      masterUploadedAt: null,
      processingStatus: 'NO_MASTER'
    }
  });

  return NextResponse.json({
    ok: true,
    video: await getProcessingVideo(params.id)
  });
}
