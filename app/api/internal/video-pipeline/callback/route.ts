import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  applyPipelineFailure,
  applyPipelineSubmission,
  closePipelineDeployment,
  finalizePipelineSuccess
} from '@/lib/video-pipeline';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CallbackBody = {
  stage?: string;
  videoId?: string;
  jobId?: string | null;
  taskId?: string | null;
  job?: Record<string, unknown> | null;
  hlsOutputPath?: string | null;
  hlsManifestKey?: string | null;
  error?: string | null;
  message?: string | null;
};

function isAuthorized(req: NextRequest) {
  const providedSecret = req.headers.get('x-ace-pipeline-secret')?.trim();
  return Boolean(env.CONTABO_PIPELINE_SECRET && providedSecret && providedSecret === env.CONTABO_PIPELINE_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CallbackBody | null;
  const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
  const stage = typeof body?.stage === 'string' ? body.stage.trim().toLowerCase() : '';
  const taskId = typeof body?.jobId === 'string'
    ? body.jobId.trim()
    : typeof body?.taskId === 'string'
      ? body.taskId.trim()
      : null;
  const hlsOutputPath = typeof body?.hlsOutputPath === 'string' ? body.hlsOutputPath.trim() : null;
  const hlsManifestKey = typeof body?.hlsManifestKey === 'string' ? body.hlsManifestKey.trim() : null;

  if (!videoId || !stage) {
    return NextResponse.json({ error: 'videoId and stage are required.' }, { status: 400 });
  }

  const technicalMetadata = await prisma.videoTechnicalMetadata.findUnique({
    where: { videoId },
    select: {
      orchestrationJobId: true
    }
  });

  await prisma.webhookEvent.create({
    data: {
      endpoint: 'video-pipeline-callback',
      eventType: stage,
      externalId: taskId ?? technicalMetadata?.orchestrationJobId ?? videoId,
      payload: (body ?? {}) as never,
      processed: false
    }
  });

  try {
    if (stage === 'submitted') {
      await applyPipelineSubmission({
        videoId,
        orchestrationJobId: taskId ?? technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        hlsOutputPath,
        hlsManifestKey
      });
    } else if (stage === 'completed') {
      await finalizePipelineSuccess({
        videoId,
        orchestrationJobId: taskId ?? technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        job: (body?.job as never) ?? null,
        hlsOutputPath,
        hlsManifestKey
      });
      await closePipelineDeployment(technicalMetadata?.orchestrationJobId);
    } else if (stage === 'failed' || stage === 'timeout') {
      await applyPipelineFailure({
        videoId,
        orchestrationJobId: taskId ?? technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        job: (body?.job as never) ?? null,
        fallbackMessage:
          body?.error ??
          body?.message ??
          (stage === 'timeout' ? 'The Contabo worker timed out while transcoding the movie.' : undefined)
      });
      await closePipelineDeployment(technicalMetadata?.orchestrationJobId);
    } else {
      return NextResponse.json({ error: 'Unknown stage.' }, { status: 400 });
    }

    await prisma.webhookEvent.updateMany({
      where: {
        endpoint: 'video-pipeline-callback',
        eventType: stage,
        externalId: taskId ?? technicalMetadata?.orchestrationJobId ?? videoId,
        processed: false
      },
      data: {
        processed: true,
        processedAt: new Date()
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[video-pipeline-callback] failed', {
      videoId,
      stage,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unable to process pipeline callback.'
    }, { status: 500 });
  }
}
