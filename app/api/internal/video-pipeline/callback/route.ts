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
  taskId?: string | null;
  task?: Record<string, unknown> | null;
  hlsOutputPath?: string | null;
};

function isAuthorized(req: NextRequest) {
  const providedSecret = req.headers.get('x-ace-pipeline-secret')?.trim();
  return Boolean(env.AKASH_CALLBACK_SECRET && providedSecret && providedSecret === env.AKASH_CALLBACK_SECRET);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CallbackBody | null;
  const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
  const stage = typeof body?.stage === 'string' ? body.stage.trim().toLowerCase() : '';
  const taskId = typeof body?.taskId === 'string' ? body.taskId.trim() : null;
  const hlsOutputPath = typeof body?.hlsOutputPath === 'string' ? body.hlsOutputPath.trim() : null;

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
        orchestrationJobId: technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        task: (body?.task as never) ?? null,
        hlsOutputPath
      });
    } else if (stage === 'completed') {
      await finalizePipelineSuccess({
        videoId,
        orchestrationJobId: technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        task: (body?.task as never) ?? null,
        hlsOutputPath
      });
      await closePipelineDeployment(technicalMetadata?.orchestrationJobId);
    } else if (stage === 'failed' || stage === 'timeout') {
      await applyPipelineFailure({
        videoId,
        orchestrationJobId: technicalMetadata?.orchestrationJobId ?? null,
        taskId,
        task: (body?.task as never) ?? null,
        fallbackMessage: stage === 'timeout' ? 'The Akash worker timed out while waiting for Livepeer.' : undefined
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
