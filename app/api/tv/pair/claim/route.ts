import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isPairingExpired, isValidPairingCode, normalizePairingCode } from '@/lib/pairing';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    key: `tv-pair-claim:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 12,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many pairing claim attempts right now. Please wait and try again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const code = normalizePairingCode(body.code);
  if (!code) return NextResponse.json({ error: 'Missing pairing code' }, { status: 400 });
  if (!isValidPairingCode(code)) return NextResponse.json({ error: 'Enter the 6-character code shown on the TV screen.' }, { status: 400 });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const session = await tx.tvPairingSession.findUnique({ where: { code } });
      if (!session) {
        throw new Error('PAIRING_NOT_FOUND');
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`tv-pair-claim:${session.id}`}))`;
      const lockedSession = await tx.tvPairingSession.findUnique({ where: { id: session.id } });
      if (!lockedSession) {
        throw new Error('PAIRING_NOT_FOUND');
      }
      if (lockedSession.status === 'COMPLETED') {
        throw new Error('PAIRING_USED');
      }
      if (lockedSession.status === 'CLAIMED' && lockedSession.claimedById && lockedSession.claimedById !== auth.sub) {
        throw new Error('PAIRING_ALREADY_CLAIMED');
      }
      if (lockedSession.status === 'EXPIRED' || isPairingExpired(lockedSession.expiresAt)) {
        await tx.tvPairingSession.update({ where: { id: lockedSession.id }, data: { status: 'EXPIRED' } });
        throw new Error('PAIRING_EXPIRED');
      }
      if (lockedSession.status === 'CLAIMED' && lockedSession.claimedById === auth.sub) {
        return lockedSession;
      }

      return tx.tvPairingSession.update({
        where: { id: lockedSession.id },
        data: {
          status: 'CLAIMED',
          claimedById: auth.sub,
          claimedAt: new Date()
        }
      });
    });

    return NextResponse.json({ ok: true, sessionId: updated.id, status: updated.status });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAIRING_NOT_FOUND') {
      return NextResponse.json({ error: 'Pairing code not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'PAIRING_USED') {
      return NextResponse.json({ error: 'Pairing code already used' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'PAIRING_ALREADY_CLAIMED') {
      return NextResponse.json({ error: 'This pairing code was already claimed on another account.' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'PAIRING_EXPIRED') {
      return NextResponse.json({ error: 'Pairing code expired' }, { status: 410 });
    }

    return NextResponse.json({ error: 'Unable to claim pairing code right now.' }, { status: 500 });
  }
}
