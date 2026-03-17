import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { isPairingExpired } from '@/lib/pairing';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return NextResponse.json({ error: 'Missing pairing code' }, { status: 400 });

  const session = await prisma.tvPairingSession.findUnique({ where: { code } });
  if (!session) return NextResponse.json({ error: 'Pairing code not found' }, { status: 404 });
  if (session.status === 'COMPLETED') return NextResponse.json({ error: 'Pairing code already used' }, { status: 409 });
  if (isPairingExpired(session.expiresAt)) {
    await prisma.tvPairingSession.update({ where: { id: session.id }, data: { status: 'EXPIRED' } });
    return NextResponse.json({ error: 'Pairing code expired' }, { status: 410 });
  }

  const updated = await prisma.tvPairingSession.update({
    where: { id: session.id },
    data: {
      status: 'CLAIMED',
      claimedById: auth.sub,
      claimedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true, sessionId: updated.id, status: updated.status });
}
