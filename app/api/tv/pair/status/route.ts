import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPairingExpired } from '@/lib/pairing';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  const session = await prisma.tvPairingSession.findUnique({
    where: { id: sessionId },
    include: { claimedBy: { select: { email: true } } }
  });
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  if (session.status !== 'EXPIRED' && isPairingExpired(session.expiresAt)) {
    await prisma.tvPairingSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' }
    });
    return NextResponse.json({
      status: 'EXPIRED',
      expiresAt: session.expiresAt
    });
  }

  return NextResponse.json({
    status: session.status,
    code: session.code,
    expiresAt: session.expiresAt,
    claimedBy: session.claimedBy?.email ?? null
  });
}
