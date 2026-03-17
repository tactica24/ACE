import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createAuthToken } from '@/lib/auth';
import { isPairingExpired } from '@/lib/pairing';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const session = await prisma.tvPairingSession.findUnique({
    where: { id: sessionId },
    include: { claimedBy: true }
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (isPairingExpired(session.expiresAt)) {
    await prisma.tvPairingSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'Session expired' }, { status: 410 });
  }
  if (!session.claimedBy) return NextResponse.json({ status: session.status }, { status: 409 });

  const token = createAuthToken({
    sub: session.claimedBy.id,
    role: session.claimedBy.role,
    email: session.claimedBy.email,
    phone: session.claimedBy.phone
  });

  await prisma.tvPairingSession.update({
    where: { id: session.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('ace_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
  return response;
}
