import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const videoId = body.videoId as string | undefined;
  const reason = body.reason as string | undefined;
  const action = body.action === 'restore' ? 'restore' : 'archive';
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  if (action === 'archive' && !reason) return NextResponse.json({ error: 'Missing reason' }, { status: 400 });

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      videoType: true,
      seriesId: true
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found.' }, { status: 404 });
  }

  const nextStatus = action === 'restore' ? 'DRAFT' : 'ARCHIVED';

  await prisma.video.update({
    where: { id: videoId },
    data: { status: nextStatus }
  });

  if (video.videoType === 'SERIES' && !video.seriesId) {
    await prisma.video.updateMany({
      where: { seriesId: videoId },
      data: { status: nextStatus }
    });
  }

  await prisma.moderationItem.upsert({
    where: { videoId },
    update: {
      status: 'APPROVED',
      reviewerId: auth.sub,
      notes: action === 'restore' ? 'Restored from deleted titles.' : reason
    },
    create: {
      videoId,
      status: 'APPROVED',
      reviewerId: auth.sub,
      notes: action === 'restore' ? 'Restored from deleted titles.' : reason
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({
    ok: true,
    status: nextStatus,
    message:
      action === 'restore'
        ? 'Movie restored to the edit queue.'
        : 'Movie moved to deleted titles. It can be restored later.'
  });
}
