import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createBunnyStreamVideo, createBunnyTusUploadSignature, getBunnyStreamLibraryId } from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const assetType = body.assetType === 'trailer' ? 'trailer' : body.assetType === 'movie' ? 'movie' : '';
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const fileSize = Number(body.fileSize ?? 0);

  if (!videoId || !assetType || !filename) {
    return NextResponse.json({ error: 'videoId, assetType, and filename are required.' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      technicalMetadata: {
        select: {
          bunnyStreamVideoId: true,
          trailerStreamVideoId: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const existingVideoId =
    assetType === 'movie' ? video.technicalMetadata?.bunnyStreamVideoId : video.technicalMetadata?.trailerStreamVideoId;

  const streamVideo = existingVideoId
    ? {
        libraryId: getBunnyStreamLibraryId(),
        videoId: existingVideoId
      }
    : await createBunnyStreamVideo({
        title: assetType === 'movie' ? video.title : `${video.title} Trailer`
      });

  const tusUpload = createBunnyTusUploadSignature(streamVideo.videoId);

  await prisma.$transaction([
    prisma.video.update({
      where: { id: videoId },
      data: assetType === 'movie' ? { status: 'PROCESSING' } : {}
    }),
    prisma.videoTechnicalMetadata.upsert({
      where: { videoId },
      create: {
        videoId,
        processingStatus: assetType === 'movie' ? 'STREAM_UPLOAD_CREATED' : 'NO_MASTER',
        ...(assetType === 'movie'
          ? {
              bunnyStreamLibraryId: streamVideo.libraryId,
              bunnyStreamVideoId: streamVideo.videoId,
              bunnyStreamStatus: 'created',
              bunnyStreamReadyAt: null,
              bunnyStreamError: null,
              masterFileName: filename,
              masterFileSize: Number.isFinite(fileSize) ? BigInt(Math.max(0, Math.trunc(fileSize))) : null,
              masterUploadedAt: new Date(),
              transcodeRequestedAt: new Date()
            }
          : {
              trailerStreamLibraryId: streamVideo.libraryId,
              trailerStreamVideoId: streamVideo.videoId,
              trailerStreamStatus: 'created',
              trailerStreamReadyAt: null,
              trailerStreamError: null
            })
      },
      update: assetType === 'movie'
        ? {
            processingStatus: 'STREAM_UPLOAD_CREATED',
            bunnyStreamLibraryId: streamVideo.libraryId,
            bunnyStreamVideoId: streamVideo.videoId,
            bunnyStreamStatus: 'created',
            bunnyStreamReadyAt: null,
            bunnyStreamError: null,
            masterFileName: filename,
            masterFileSize: Number.isFinite(fileSize) ? BigInt(Math.max(0, Math.trunc(fileSize))) : undefined,
            masterUploadedAt: new Date(),
            transcodeRequestedAt: new Date()
          }
        : {
            trailerStreamLibraryId: streamVideo.libraryId,
            trailerStreamVideoId: streamVideo.videoId,
            trailerStreamStatus: 'created',
            trailerStreamReadyAt: null,
            trailerStreamError: null
          }
    })
  ]);

  return NextResponse.json({
    ok: true,
    upload: {
      ...tusUpload,
      assetType
    },
    playback: {
      embedUrl: `https://player.mediadelivery.net/embed/${encodeURIComponent(streamVideo.libraryId)}/${encodeURIComponent(streamVideo.videoId)}`
    }
  });
}
