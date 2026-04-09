import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { isPairingExpired } from '@/lib/pairing';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimit = await consumeRateLimit({
    key: `tv-pair-finalize:${getRateLimitIdentity(req)}`,
    limit: 20,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many pairing finalize attempts right now. Please wait and try again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

  try {
    const customToken = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`tv-pair-finalize:${sessionId}`}))`;
      const session = await tx.tvPairingSession.findUnique({
        where: { id: sessionId },
        include: { claimedBy: true }
      });
      if (!session) {
        throw new Error('PAIRING_NOT_FOUND');
      }
      if (session.status === 'COMPLETED') {
        throw new Error('PAIRING_USED');
      }
      if (session.status !== 'CLAIMED') {
        throw new Error('PAIRING_NOT_CLAIMED');
      }
      if (session.status === 'EXPIRED' || isPairingExpired(session.expiresAt)) {
        await tx.tvPairingSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
        throw new Error('PAIRING_EXPIRED');
      }
      if (!session.claimedBy?.firebaseUid) {
        throw new Error('PAIRING_CLAIMED_USER_INVALID');
      }

      const token = await getFirebaseAdminAuth().createCustomToken(session.claimedBy.firebaseUid, {
        role: session.claimedBy.role
      });

      await tx.tvPairingSession.update({
        where: { id: session.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      return token;
    });

    return NextResponse.json({ ok: true, customToken });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAIRING_NOT_FOUND') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'PAIRING_USED') {
      return NextResponse.json({ error: 'Pairing session already used' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'PAIRING_NOT_CLAIMED') {
      return NextResponse.json({ error: 'Pairing session must be claimed before it can be finalized.' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'PAIRING_EXPIRED') {
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }
    if (error instanceof Error && error.message === 'PAIRING_CLAIMED_USER_INVALID') {
      return NextResponse.json({ error: 'Claimed user is not linked to Firebase Auth yet.' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Unable to finalize pairing right now.' }, { status: 500 });
  }
}
