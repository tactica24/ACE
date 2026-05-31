import { prisma } from './db';
import { createAkashDeployment, buildAkashWorkerSdl, closeAkashDeployment, createAkashLease, waitForAkashBid } from './akash';
import { env } from './env';
import { createSignedHlsManifestUrl, getDefaultHlsOutputPath, getHlsManifestKeyFromOutputPath, verifyHlsManifest } from './hls';
import { getLivepeerHlsOutputPath, getLivepeerManifestKey, getLivepeerTask, getLivepeerTaskPhase, type LivepeerTask } from './livepeer';
import { normalizeMediaKey } from './media';

type PipelineVideo = {
  id: string;
  title: string;
  status: string;
  creatorId: string;
  technicalMetadata: {
    masterKey: string | null;
    orchestrationJobId: string | null;
    transcodeTaskId: string | null;
    hlsOutputPath: string | null;
    hlsManifestKey: string | null;
    masterDeletedAt: Date | null;
  } | null;
};

function getPipelineCallbackUrl() {
  const baseUrl = env.ACE_APP_BASE_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('ACE_APP_BASE_URL is required for Akash callbacks.');
  }

  return `${baseUrl}/api/internal/video-pipeline/callback`;
}

async function getPipelineVideo(videoId: string): Promise<PipelineVideo | null> {
  return prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      status: true,
      creatorId: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          orchestrationJobId: true,
          transcodeTaskId: true,
          hlsOutputPath: true,
          hlsManifestKey: true,
          masterDeletedAt: true
        }
      }
    }
  });
}

function ensureVideoCanStartPipeline(video: PipelineVideo) {
  const masterKey = normalizeMediaKey(video.technicalMetadata?.masterKey);
  if (!masterKey) {
    throw new Error('Upload a Bunny master first before starting HLS processing.');
  }

  if (video.technicalMetadata?.masterDeletedAt) {
    throw new Error('This title no longer has a master file. Re-upload the master before reprocessing.');
  }

  return masterKey;
}

export async function queueVideoHlsPipeline(videoId: string) {
  const video = await getPipelineVideo(videoId);
  if (!video) {
    throw new Error('Movie not found.');
  }

  const masterKey = ensureVideoCanStartPipeline(video);
  const hlsOutputPath = video.technicalMetadata?.hlsOutputPath ?? getDefaultHlsOutputPath(videoId);
  const sdl = buildAkashWorkerSdl({
    callbackUrl: getPipelineCallbackUrl(),
    videoId,
    masterKey,
    hlsOutputPath
  });

  const deployment = await createAkashDeployment(sdl);
  const bid = await waitForAkashBid(deployment.dseq);
  await createAkashLease({
    manifest: deployment.manifest,
    dseq: deployment.dseq,
    gseq: bid.gseq,
    oseq: bid.oseq,
    provider: bid.provider
  });

  await prisma.$transaction([
    prisma.video.update({
      where: { id: videoId },
      data: {
        status: video.status === 'PUBLISHED' ? 'PUBLISHED' : 'PROCESSING'
      }
    }),
    prisma.videoTechnicalMetadata.upsert({
      where: { videoId },
      create: {
        videoId,
        masterKey,
        processingStatus: 'AKASH_QUEUED',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: deployment.dseq,
        hlsOutputPath,
        hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath),
        transcodeProvider: 'LIVEPEER',
        transcodeError: null,
        transcodeFailedAt: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false
      },
      update: {
        processingStatus: 'AKASH_QUEUED',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: deployment.dseq,
        hlsOutputPath,
        hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath),
        transcodeProvider: 'LIVEPEER',
        transcodeError: null,
        transcodeFailedAt: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false,
        masterDeletedAt: null
      }
    })
  ]);

  return {
    dseq: deployment.dseq,
    hlsOutputPath
  };
}

export async function applyPipelineSubmission(input: {
  videoId: string;
  orchestrationJobId?: string | null;
  taskId?: string | null;
  task?: LivepeerTask | null;
  hlsOutputPath?: string | null;
}) {
  const hlsOutputPath = input.hlsOutputPath ?? getLivepeerHlsOutputPath(input.task ?? { id: input.taskId ?? '' }, input.videoId) ?? getDefaultHlsOutputPath(input.videoId);
  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: input.videoId },
    create: {
      videoId: input.videoId,
      processingStatus: 'ENCODING_STARTED',
      orchestrationProvider: 'AKASH',
      orchestrationJobId: input.orchestrationJobId ?? null,
      transcodeProvider: 'LIVEPEER',
      transcodeTaskId: input.taskId ?? null,
      transcodeRequestedAt: new Date(),
      transcodeError: null,
      transcodeFailedAt: null,
      hlsOutputPath,
      hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath)
    },
    update: {
      processingStatus: 'ENCODING_STARTED',
      orchestrationProvider: 'AKASH',
      orchestrationJobId: input.orchestrationJobId ?? undefined,
      transcodeProvider: 'LIVEPEER',
      transcodeTaskId: input.taskId ?? undefined,
      transcodeRequestedAt: new Date(),
      transcodeError: null,
      transcodeFailedAt: null,
      hlsOutputPath,
      hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath)
    }
  });
}

export async function applyPipelineFailure(input: {
  videoId: string;
  orchestrationJobId?: string | null;
  taskId?: string | null;
  task?: LivepeerTask | null;
  fallbackMessage?: string;
}) {
  const message =
    input.task?.status?.error ??
    input.task?.status?.message ??
    input.fallbackMessage ??
    'Transcoding failed.';

  await prisma.$transaction([
    prisma.video.update({
      where: { id: input.videoId },
      data: {
        status: 'MASTER_UPLOADED'
      }
    }),
    prisma.videoTechnicalMetadata.upsert({
      where: { videoId: input.videoId },
      create: {
        videoId: input.videoId,
        processingStatus: 'TRANSCODE_FAILED',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: input.orchestrationJobId ?? null,
        transcodeProvider: 'LIVEPEER',
        transcodeTaskId: input.taskId ?? null,
        transcodeFailedAt: new Date(),
        transcodeError: message,
        masterDeletionEligible: false
      },
      update: {
        processingStatus: 'TRANSCODE_FAILED',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: input.orchestrationJobId ?? undefined,
        transcodeProvider: 'LIVEPEER',
        transcodeTaskId: input.taskId ?? undefined,
        transcodeFailedAt: new Date(),
        transcodeError: message,
        masterDeletionEligible: false
      }
    })
  ]);
}

export async function finalizePipelineSuccess(input: {
  videoId: string;
  orchestrationJobId?: string | null;
  taskId?: string | null;
  task?: LivepeerTask | null;
  hlsOutputPath?: string | null;
}) {
  const hlsOutputPath =
    input.hlsOutputPath ??
    getLivepeerHlsOutputPath(input.task ?? { id: input.taskId ?? '' }, input.videoId) ??
    getDefaultHlsOutputPath(input.videoId);
  const manifestKey =
    getLivepeerManifestKey(input.task ?? { id: input.taskId ?? '' }, input.videoId) ??
    getHlsManifestKeyFromOutputPath(hlsOutputPath);

  if (!manifestKey) {
    throw new Error('Livepeer completed but no HLS manifest path was returned.');
  }

  await verifyHlsManifest(manifestKey);
  const playbackUrl = createSignedHlsManifestUrl(manifestKey);

  await prisma.$transaction([
    prisma.video.update({
      where: { id: input.videoId },
      data: {
        status: 'READY'
      }
    }),
    prisma.videoTechnicalMetadata.upsert({
      where: { videoId: input.videoId },
      create: {
        videoId: input.videoId,
        processingStatus: 'READY_TO_STREAM',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: input.orchestrationJobId ?? null,
        transcodeProvider: 'LIVEPEER',
        transcodeTaskId: input.taskId ?? null,
        hlsOutputPath,
        hlsManifestKey: manifestKey,
        hlsReadyAt: new Date(),
        readyToStreamAt: new Date(),
        playbackUrl,
        masterDeletionEligible: true,
        transcodeError: null,
        transcodeFailedAt: null
      },
      update: {
        processingStatus: 'READY_TO_STREAM',
        orchestrationProvider: 'AKASH',
        orchestrationJobId: input.orchestrationJobId ?? undefined,
        transcodeProvider: 'LIVEPEER',
        transcodeTaskId: input.taskId ?? undefined,
        hlsOutputPath,
        hlsManifestKey: manifestKey,
        hlsReadyAt: new Date(),
        readyToStreamAt: new Date(),
        playbackUrl,
        masterDeletionEligible: true,
        transcodeError: null,
        transcodeFailedAt: null
      }
    })
  ]);
}

export async function syncPipelineTask(videoId: string) {
  const video = await getPipelineVideo(videoId);
  if (!video?.technicalMetadata?.transcodeTaskId) {
    throw new Error('No Livepeer task is linked to this title yet.');
  }

  const task = await getLivepeerTask(video.technicalMetadata.transcodeTaskId);
  const phase = getLivepeerTaskPhase(task);
  if (phase === 'completed' || phase === 'success' || phase === 'ready') {
    await finalizePipelineSuccess({
      videoId,
      orchestrationJobId: video.technicalMetadata.orchestrationJobId,
      taskId: video.technicalMetadata.transcodeTaskId,
      task
    });
  } else if (phase === 'failed' || phase === 'error') {
    await applyPipelineFailure({
      videoId,
      orchestrationJobId: video.technicalMetadata.orchestrationJobId,
      taskId: video.technicalMetadata.transcodeTaskId,
      task
    });
  } else {
    await prisma.videoTechnicalMetadata.update({
      where: { videoId },
      data: {
        processingStatus: 'ENCODING_STARTED',
        transcodeError: null
      }
    });
  }

  return task;
}

export async function closePipelineDeployment(orchestrationJobId?: string | null) {
  if (!orchestrationJobId) return;

  try {
    await closeAkashDeployment(orchestrationJobId);
  } catch (error) {
    console.error('[video-pipeline] unable to close Akash deployment', {
      orchestrationJobId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
