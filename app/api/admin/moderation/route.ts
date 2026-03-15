import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.moderationItem.findMany({
    where: { status: 'PENDING' },
    include: { video: true }
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      status: item.status,
      video: {
        id: item.video.id,
        title: item.video.title,
        description: item.video.description
      }
    }))
  });
}
