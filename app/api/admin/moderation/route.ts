import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { type ModerationQueueItem } from '@/components/ModerationQueue';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.moderationItem.findMany({
    where: { status: { in: ['PENDING', 'APPROVED'] } },
    include: { video: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  const formattedItems: ModerationQueueItem[] = items.map((item) => ({
    id: item.id,
    status: item.status,
    notes: item.notes,
    video: {
      id: item.video.id,
      title: item.video.title,
      description: item.video.description,
      category: item.video.category,
      status: item.video.status
    }
  }));

  return NextResponse.json({
    items: formattedItems
  });
}
