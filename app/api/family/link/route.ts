import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const recipientPhone = body.recipientPhone as string | undefined;
  if (!recipientPhone) return NextResponse.json({ error: 'Missing recipientPhone' }, { status: 400 });

  const existing = await prisma.familyLink.findFirst({
    where: { ownerId: auth.sub, recipientPhone }
  });
  if (existing) return NextResponse.json({ ok: true, link: existing });

  const link = await prisma.familyLink.create({
    data: {
      ownerId: auth.sub,
      recipientPhone
    }
  });

  return NextResponse.json({ ok: true, link });
}

