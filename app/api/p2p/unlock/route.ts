import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest, createP2PToken } from '@/lib/auth';
import { debitWallet } from '@/lib/wallet';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const transferId = body.transferId as string | undefined;
  if (!transferId) return NextResponse.json({ error: 'Missing transferId' }, { status: 400 });

  const transfer = await prisma.p2PTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });

  if (transfer.recipientPhone !== auth.phone) {
    return NextResponse.json({ error: 'Recipient mismatch' }, { status: 403 });
  }

  if (transfer.status !== 'UNLOCKED') {
    try {
      await debitWallet(auth.sub, transfer.unlockFee);
    } catch {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    await prisma.p2PTransfer.update({ where: { id: transferId }, data: { status: 'UNLOCKED' } });
  }

  const token = createP2PToken({ transferId, userId: auth.sub });
  return NextResponse.json({ ok: true, downloadUrl: `/api/p2p/download/${transferId}?token=${token}` });
}




