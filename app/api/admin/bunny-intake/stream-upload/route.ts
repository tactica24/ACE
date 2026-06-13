import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import {
  createBunnyStreamVideo,
  createBunnyTusUploadSignature,
  fetchBunnyStreamVideoFromUrl,
  getBunnyStreamVideo,
  getBunnyStreamLibraryId
} from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';
import { normalizeDropboxSourceUrl } from '@/lib/master-source';

async function resolveReusableStreamVideo(input: {
  assetType: 'movie' | 'trailer';
  existingVideoId: string | null | undefined;
  title: string;
}) {
  if (!input.existingVideoId) {
    return createBunnyStreamVideo({
      title: input.assetType === 'movie' ? input.title : `${input.title} Trailer`
    });
  }

  try {
    await getBunnyStreamVideo(input.existingVideoId, getBunnyStreamLibraryId());
    return {
      libraryId: getBunnyStreamLibraryId(),
      videoId: input.existingVideoId
    };
  } catch {
    return createBunnyStreamVideo({
      title: input.assetType === 'movie' ? input.title : `${input.title} Trailer`
    });
  }
}

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
  const rawSourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : '';
  const sourceUrl = rawSourceUrl ? normalizeDropboxSourceUrl(rawSourceUrl) : null;
  const uploadMode = sourceUrl ? 'dropbox' : 'local';

  if (!videoId || !assetType || (!filename && !sourceUrl)) {
    return NextResponse.json({ error: 'videoId, assetType, and either filename or sourceUrl are required.' }, { status: 400 });
  }

  if (rawSourceUrl && !sourceUrl) {
    return NextResponse.json({ error: 'Provide a valid Dropbox share URL.' }, { status: 400 });
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

  const remoteAssetTitle = `ACE ${video.id} ${assetType} ${video.title}`;
  const streamVideo = sourceUrl
    ? await fetchBunnyStreamVideoFromUrl({
        sourceUrl,
        title: remoteAssetTitle
      })
    : await resolveReusableStreamVideo({
        assetType,
        existingVideoId,
        title: video.title
      });

  const tusUpload = sourceUrl ? null : createBunnyTusUploadSignature(streamVideo.videoId);

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
              masterFileName: filename || null,
              masterFileSize: Number.isFinite(fileSize) ? BigInt(Math.max(0, Math.trunc(fileSize))) : null,
              masterSourceUrl: sourceUrl,
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
            masterFileName: filename || null,
            masterFileSize: Number.isFinite(fileSize) ? BigInt(Math.max(0, Math.trunc(fileSize))) : undefined,
            masterSourceUrl: sourceUrl,
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
    upload: tusUpload
      ? {
          ...tusUpload,
          assetType,
          mode: uploadMode
        }
      : {
          assetType,
          mode: uploadMode,
          sourceUrl
        },
    playback: {
      embedUrl: `https://player.mediadelivery.net/embed/${encodeURIComponent(streamVideo.libraryId)}/${encodeURIComponent(streamVideo.videoId)}`
    }
  });
}
