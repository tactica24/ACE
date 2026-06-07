import { randomUUID } from 'crypto';
import { ensureStorageFolderMarker } from './bunny-storage';
import { prisma } from './db';
import { createContaboTranscodeJob, getContaboTranscodeJob, type ContaboTranscodeJob } from './contabo';
import { env } from './env';
import {
  createSignedHlsManifestUrl,
  getDefaultHlsOutputPath,
  getHlsManifestKeyFromOutputPath,
  resolveVideoHlsManifestKey,
  verifyHlsManifest
} from './hls';
import { normalizeMediaKey } from './media';

type PipelineVideo = {
  id: string;
  title: string;
  status: string;
  creatorId: string;
  technicalMetadata: {
    masterKey: string | null;
    masterSourceUrl: string | null;
    processingStatus: string | null;
    orchestrationJobId: string | null;
    hlsOutputPath: string | null;
    hlsManifestKey: string | null;
    hlsReadyAt: Date | null;
    masterDeletedAt: Date | null;
  } | null;
};

const ACTIVE_CONTABO_STATUSES = ['CONTABO_QUEUED', 'ENCODING_STARTED'];

function getPipelineCallbackUrl() {
  const baseUrl = env.ACE_APP_BASE_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('ACE_APP_BASE_URL is required for Contabo worker callbacks.');
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
          masterSourceUrl: true,
          processingStatus: true,
          orchestrationJobId: true,
          hlsOutputPath: true,
          hlsManifestKey: true,
          hlsReadyAt: true,
          masterDeletedAt: true
        }
      }
    }
  });
}

function ensureVideoCanStartPipeline(video: PipelineVideo) {
  const processingStatus = video.technicalMetadata?.processingStatus ?? null;
  if (processingStatus && ACTIVE_CONTABO_STATUSES.includes(processingStatus)) {
    throw new Error('Contabo is already processing this title. Use sync status to refresh the latest worker state.');
  }

  if (video.technicalMetadata?.hlsReadyAt && resolveVideoHlsManifestKey(video)) {
    throw new Error('This title already has Bunny HLS playback ready. Publish it or replace the source before reprocessing.');
  }

  const masterKey = normalizeMediaKey(video.technicalMetadata?.masterKey);
  const masterSourceUrl =
    typeof video.technicalMetadata?.masterSourceUrl === 'string'
      ? video.technicalMetadata.masterSourceUrl.trim()
      : '';
  if (!masterKey && !masterSourceUrl) {
    throw new Error('Attach a Bunny master or Dropbox master URL first before starting HLS processing.');
  }

  if (video.technicalMetadata?.masterDeletedAt) {
    throw new Error('This title no longer has a master file. Re-upload the master before reprocessing.');
  }

  return {
    masterKey,
    masterSourceUrl: masterSourceUrl || null
  };
}

async function ensureSingleActiveContaboJob(videoId: string) {
  const activeJob = await prisma.videoTechnicalMetadata.findFirst({
    where: {
      videoId: { not: videoId },
      processingStatus: { in: ACTIVE_CONTABO_STATUSES },
      orchestrationProvider: 'CONTABO'
    },
    select: {
      video: { select: { title: true } },
      orchestrationJobId: true
    }
  });

  if (activeJob) {
    throw new Error(
      `Another Contabo transcode is already active${activeJob.video?.title ? ` for "${activeJob.video.title}"` : ''}. Finish or fail it before starting the next movie.`
    );
  }
}

function normalizeJobStatus(job: ContaboTranscodeJob) {
  return String(job.status ?? '').trim().toLowerCase();
}

function getContaboError(job: ContaboTranscodeJob, fallbackMessage?: string) {
  return job.error ?? job.message ?? fallbackMessage ?? 'Transcoding failed.';
}

export async function queueVideoHlsPipeline(videoId: string) {
  const video = await getPipelineVideo(videoId);
  if (!video) {
    throw new Error('Movie not found.');
  }

  await ensureSingleActiveContaboJob(videoId);

  const source = ensureVideoCanStartPipeline(video);
  const hlsOutputPath = video.technicalMetadata?.hlsOutputPath ?? getDefaultHlsOutputPath(videoId);
  const jobId = randomUUID();

  await ensureStorageFolderMarker(hlsOutputPath);

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
        masterKey: source.masterKey,
        processingStatus: 'CONTABO_QUEUED',
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId,
        hlsOutputPath,
        hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath),
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId,
        transcodeError: null,
        transcodeFailedAt: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false
      },
      update: {
        processingStatus: 'CONTABO_QUEUED',
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId,
        hlsOutputPath,
        hlsManifestKey: getHlsManifestKeyFromOutputPath(hlsOutputPath),
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId,
        transcodeError: null,
        transcodeFailedAt: null,
        hlsReadyAt: null,
        readyToStreamAt: null,
        masterDeletionEligible: false,
        masterDeletedAt: null
      }
    })
  ]);

  try {
    await createContaboTranscodeJob({
      jobId,
      callbackUrl: getPipelineCallbackUrl(),
      videoId,
      title: video.title,
      masterKey: source.masterKey,
      masterUrl: source.masterSourceUrl,
      hlsOutputPath
    });
  } catch (error) {
    await applyPipelineFailure({
      videoId,
      orchestrationJobId: jobId,
      fallbackMessage: error instanceof Error ? error.message : 'Unable to create Contabo job.'
    });
    throw error;
  }

  return {
    jobId,
    hlsOutputPath
  };
}

export async function applyPipelineSubmission(input: {
  videoId: string;
  orchestrationJobId?: string | null;
  taskId?: string | null;
  hlsOutputPath?: string | null;
  hlsManifestKey?: string | null;
}) {
  const hlsOutputPath = input.hlsOutputPath ?? getDefaultHlsOutputPath(input.videoId);
  const jobId = input.orchestrationJobId ?? input.taskId ?? null;
  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: input.videoId },
    create: {
      videoId: input.videoId,
      processingStatus: 'ENCODING_STARTED',
      orchestrationProvider: 'CONTABO',
      orchestrationJobId: jobId,
      transcodeProvider: 'FFMPEG',
      transcodeTaskId: jobId,
      transcodeRequestedAt: new Date(),
      transcodeError: null,
      transcodeFailedAt: null,
      hlsOutputPath,
      hlsManifestKey: input.hlsManifestKey ?? getHlsManifestKeyFromOutputPath(hlsOutputPath)
    },
    update: {
      processingStatus: 'ENCODING_STARTED',
      orchestrationProvider: 'CONTABO',
      orchestrationJobId: jobId ?? undefined,
      transcodeProvider: 'FFMPEG',
      transcodeTaskId: jobId ?? undefined,
      transcodeRequestedAt: new Date(),
      transcodeError: null,
      transcodeFailedAt: null,
      hlsOutputPath,
      hlsManifestKey: input.hlsManifestKey ?? getHlsManifestKeyFromOutputPath(hlsOutputPath)
    }
  });
}

export async function applyPipelineFailure(input: {
  videoId: string;
  orchestrationJobId?: string | null;
  taskId?: string | null;
  job?: ContaboTranscodeJob | null;
  fallbackMessage?: string;
}) {
  const jobId = input.orchestrationJobId ?? input.taskId ?? input.job?.id ?? null;
  const message = getContaboError(input.job ?? { id: jobId ?? '' }, input.fallbackMessage);

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
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId,
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId,
        transcodeFailedAt: new Date(),
        transcodeError: message,
        masterDeletionEligible: false
      },
      update: {
        processingStatus: 'TRANSCODE_FAILED',
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId ?? undefined,
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId ?? undefined,
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
  job?: ContaboTranscodeJob | null;
  hlsOutputPath?: string | null;
  hlsManifestKey?: string | null;
}) {
  const hlsOutputPath =
    input.hlsOutputPath ??
    input.job?.hlsOutputPath ??
    getDefaultHlsOutputPath(input.videoId);
  const manifestKey =
    input.hlsManifestKey ??
    input.job?.hlsManifestKey ??
    getHlsManifestKeyFromOutputPath(hlsOutputPath);
  const jobId = input.orchestrationJobId ?? input.taskId ?? input.job?.id ?? null;

  if (!manifestKey) {
    throw new Error('Contabo completed but no HLS manifest path was returned.');
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
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId,
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId,
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
        orchestrationProvider: 'CONTABO',
        orchestrationJobId: jobId ?? undefined,
        transcodeProvider: 'FFMPEG',
        transcodeTaskId: jobId ?? undefined,
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
  if (!video?.technicalMetadata?.orchestrationJobId) {
    throw new Error('No Contabo job is linked to this title yet.');
  }

  const job = await getContaboTranscodeJob(video.technicalMetadata.orchestrationJobId);
  const status = normalizeJobStatus(job);
  if (status === 'completed' || status === 'success' || status === 'ready') {
    await finalizePipelineSuccess({
      videoId,
      orchestrationJobId: video.technicalMetadata.orchestrationJobId,
      job
    });
  } else if (status === 'failed' || status === 'error' || status === 'timeout') {
    await applyPipelineFailure({
      videoId,
      orchestrationJobId: video.technicalMetadata.orchestrationJobId,
      job
    });
  } else {
    await prisma.videoTechnicalMetadata.update({
      where: { videoId },
      data: {
        processingStatus: status === 'queued' ? 'CONTABO_QUEUED' : 'ENCODING_STARTED',
        transcodeError: null
      }
    });
  }

  return job;
}

export async function closePipelineDeployment(_orchestrationJobId?: string | null) {
  return;
}
