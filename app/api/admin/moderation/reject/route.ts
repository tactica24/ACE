import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = body.id as string | undefined;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const moderation = await prisma.moderationItem.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewerId: auth.sub,
      notes: reason || undefined
    }
  });

  await prisma.video.update({ where: { id: moderation.videoId }, data: { status: 'REJECTED' } });
  revalidateApprovedCatalog();

  return NextResponse.json({ ok: true });
}
