import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const recipientEmail = normalizeEmail(typeof body.recipientEmail === 'string' ? body.recipientEmail : '');
  if (!recipientEmail) return NextResponse.json({ error: 'Missing recipientEmail' }, { status: 400 });

  const existing = await prisma.familyLink.findFirst({
    where: { ownerId: auth.sub, recipientEmail }
  });
  if (existing) return NextResponse.json({ ok: true, link: existing });

  const link = await prisma.familyLink.create({
    data: {
      ownerId: auth.sub,
      recipientEmail
    }
  });

  return NextResponse.json({ ok: true, link });
}
