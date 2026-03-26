import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  const reason = body.reason as string | undefined;
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'Missing reason' }, { status: 400 });

  await prisma.video.update({
    where: { id: videoId },
    data: { status: 'REJECTED' }
  });

  await prisma.moderationItem.upsert({
    where: { videoId },
    update: {
      status: 'REJECTED',
      reviewerId: auth.sub,
      notes: reason
    },
    create: {
      videoId,
      status: 'REJECTED',
      reviewerId: auth.sub,
      notes: reason
    }
  });

  revalidateApprovedCatalog();

  return NextResponse.json({ ok: true });
}
