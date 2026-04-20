import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { createP2PToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    key: `p2p-unlock:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 20,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many secure share unlock attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const transferId = body.transferId as string | undefined;
  if (!transferId) return NextResponse.json({ error: 'Missing transferId' }, { status: 400 });

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`p2p-unlock:${transferId}`}))`;

        const transfer = await tx.p2PTransfer.findUnique({ where: { id: transferId } });
        if (!transfer) {
          throw new Error('TRANSFER_NOT_FOUND');
        }

        if (transfer.recipientPhone !== auth.phone) {
          throw new Error('RECIPIENT_MISMATCH');
        }
        if (transfer.unlockFee <= 0) {
          throw new Error('INVALID_UNLOCK_FEE');
        }

        const settlementData = {
          transferId,
          senderUserId: transfer.senderId,
          recipientUserId: auth.sub,
          videoId: transfer.videoId,
          amountNaira: transfer.unlockFee
        };

        if (transfer.status === 'UNLOCKED') {
          await tx.p2PUnlockSettlement.upsert({
            where: { transferId },
            update: {},
            create: settlementData
          });
          return;
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: auth.sub } });
        if (!wallet || wallet.balanceNaira < transfer.unlockFee) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        await tx.wallet.update({
          where: { userId: auth.sub },
          data: { balanceNaira: { decrement: transfer.unlockFee } }
        });
        await tx.wallet.upsert({
          where: { userId: transfer.senderId },
          update: { balanceNaira: { increment: transfer.unlockFee } },
          create: { userId: transfer.senderId, balanceNaira: transfer.unlockFee }
        });

        await tx.p2PTransfer.update({
          where: { id: transferId },
          data: { status: 'UNLOCKED' }
        });

        await tx.p2PUnlockSettlement.upsert({
          where: { transferId },
          update: {},
          create: settlementData
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'TRANSFER_NOT_FOUND') {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'RECIPIENT_MISMATCH') {
      return NextResponse.json({ error: 'Recipient mismatch' }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
    }
    if (error instanceof Error && error.message === 'INVALID_UNLOCK_FEE') {
      return NextResponse.json({ error: 'This secure share has an invalid unlock fee.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Unable to unlock this transfer right now.' }, { status: 500 });
  }

  const token = createP2PToken({ transferId, userId: auth.sub });
  return NextResponse.json({ ok: true, downloadUrl: `/api/p2p/download/${transferId}?token=${token}` });
}
