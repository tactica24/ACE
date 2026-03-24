import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
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
  if (!session.claimedBy?.firebaseUid) {
    return NextResponse.json({ error: 'Claimed user is not linked to Firebase Auth yet.' }, { status: 409 });
  }

  const customToken = await getFirebaseAdminAuth().createCustomToken(session.claimedBy.firebaseUid, {
    role: session.claimedBy.role
  });

  await prisma.tvPairingSession.update({
    where: { id: session.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, customToken });
}
