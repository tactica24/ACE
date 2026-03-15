import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const displayName = body.displayName as string | undefined;
  if (!displayName) return NextResponse.json({ error: 'Missing display name' }, { status: 400 });

  await prisma.user.update({ where: { id: auth.sub }, data: { role: 'CREATOR' } });
  await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: { displayName },
    create: { userId: auth.sub, displayName }
  });

  return NextResponse.json({ ok: true });
}




