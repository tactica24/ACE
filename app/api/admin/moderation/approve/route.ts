import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const moderation = await prisma.moderationItem.update({
    where: { id },
    data: { status: 'APPROVED', reviewerId: auth.sub }
  });

  await prisma.video.update({ where: { id: moderation.videoId }, data: { status: 'APPROVED' } });
  revalidateApprovedCatalog();

  return NextResponse.json({ ok: true });
}
