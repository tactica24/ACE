import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getProcessingVideo } from '../../helpers';

const STATUS_ACTIONS: Record<string, { status: string; dateField?: 'encodingStartedAt' | 'encodingCompletedAt' | 'readyToStreamAt' }> = {
  encodingStarted: { status: 'ENCODING_STARTED', dateField: 'encodingStartedAt' },
  encodingCompleted: { status: 'ENCODING_COMPLETED', dateField: 'encodingCompletedAt' },
  readyToStream: { status: 'READY_TO_STREAM', dateField: 'readyToStreamAt' }
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await getProcessingVideo(params.id);
  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, video });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const statusUpdate = STATUS_ACTIONS[action];

  if (!statusUpdate) {
    return NextResponse.json({ error: 'Invalid workflow action.' }, { status: 400 });
  }

  const dateUpdate = statusUpdate.dateField ? { [statusUpdate.dateField]: new Date() } : {};
  await prisma.videoTechnicalMetadata.upsert({
    where: { videoId: params.id },
    create: {
      videoId: params.id,
      processingStatus: statusUpdate.status,
      ...dateUpdate
    },
    update: {
      processingStatus: statusUpdate.status,
      ...dateUpdate
    }
  });

  return NextResponse.json({ ok: true, status: statusUpdate.status });
}
