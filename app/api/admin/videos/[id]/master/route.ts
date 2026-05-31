import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteObject, getObjectStream } from '@/lib/bunny-storage';
import { deleteContaboJobArtifacts } from '@/lib/contabo';
import { getMasterDownloadFileName } from '@/lib/video-processing';
import { getProcessingVideo } from '../../helpers';
import { Readable } from 'stream';

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

  const fileName = getMasterDownloadFileName(video.technicalMetadata.masterFileName, video.title).replace(/"/g, '\\"');
  const result = await getObjectStream(video.technicalMetadata.masterKey);
  const body = result.Body as Readable | undefined;
  if (!body) {
    return NextResponse.json({ error: 'Private master could not be loaded.' }, { status: 502 });
  }

  return new Response(Readable.toWeb(body) as never, {
    status: 200,
    headers: {
      'Content-Type': result.ContentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      ...(typeof result.ContentLength === 'number' ? { 'Content-Length': String(result.ContentLength) } : {})
    }
  });
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
          processingStatus: true,
          masterDeletionEligible: true,
          hlsManifestKey: true,
          orchestrationProvider: true,
          orchestrationJobId: true
        }
      }
    }
  });

  if (!video?.technicalMetadata?.masterKey) {
    return NextResponse.json({ error: 'Private master not found.' }, { status: 404 });
  }

  if (!video.technicalMetadata.masterDeletionEligible || !video.technicalMetadata.hlsManifestKey) {
    return NextResponse.json({
      error: 'Keep the master until HLS is verified and marked safe for cleanup.'
    }, { status: 400 });
  }

  if (video.technicalMetadata.orchestrationProvider === 'CONTABO' && video.technicalMetadata.orchestrationJobId) {
    await deleteContaboJobArtifacts(video.technicalMetadata.orchestrationJobId);
  }

  await deleteObject(video.technicalMetadata.masterKey);
  await prisma.videoTechnicalMetadata.update({
    where: { videoId: params.id },
    data: {
      masterKey: null,
      masterFileName: null,
      masterFileSize: null,
      masterUploadedAt: null,
      processingStatus: 'READY_TO_STREAM',
      masterDeletedAt: new Date()
    }
  });

  return NextResponse.json({
    ok: true,
    video: await getProcessingVideo(params.id)
  });
}
