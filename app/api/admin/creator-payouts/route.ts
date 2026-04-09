import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const payoutRequestId = typeof body.payoutRequestId === 'string' ? body.payoutRequestId : '';
  const action = typeof body.action === 'string' ? body.action : '';
  const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : '';

  if (!payoutRequestId || !new Set(['approve', 'reject', 'mark_paid']).has(action)) {
    return NextResponse.json({ error: 'Invalid payout action.' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-payout:${payoutRequestId}`}))`;

        const payout = await tx.creatorPayoutRequest.findUnique({
          where: { id: payoutRequestId },
          include: { creatorProfile: true }
        });

        if (!payout) {
          throw new Error('Payout request not found.');
        }

        const nextAdminNote = adminNote || payout.adminNote || null;
        const now = new Date();

        if (action === 'approve') {
          if (payout.status !== 'PENDING') {
            throw new Error('Only pending payout requests can be approved.');
          }

          const updated = await tx.creatorPayoutRequest.update({
            where: { id: payoutRequestId },
            data: {
              status: 'APPROVED',
              adminNote: nextAdminNote,
              reviewerId: auth.sub,
              reviewedAt: now
            }
          });

          return { payout: updated };
        }

        if (action === 'reject') {
          if (payout.status === 'REJECTED') {
            throw new Error('This payout request has already been rejected.');
          }
          if (payout.status === 'PAID') {
            throw new Error('A paid payout request cannot be rejected.');
          }

          const updated = await tx.creatorPayoutRequest.update({
            where: { id: payoutRequestId },
            data: {
              status: 'REJECTED',
              adminNote: nextAdminNote,
              reviewerId: auth.sub,
              reviewedAt: now,
              paidAt: null
            }
          });

          await tx.creatorProfile.update({
            where: { id: payout.creatorProfileId },
            data: {
              earningsBalanceNaira: {
                increment: payout.amountNaira
              }
            }
          });

          return { payout: updated };
        }

        if (payout.status !== 'APPROVED') {
          throw new Error('Only approved payout requests can be marked as paid.');
        }

        const updated = await tx.creatorPayoutRequest.update({
          where: { id: payoutRequestId },
          data: {
            status: 'PAID',
            adminNote: nextAdminNote,
            reviewerId: auth.sub,
            reviewedAt: payout.reviewedAt ?? now,
            paidAt: now
          }
        });

        return { payout: updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ ok: true, payout: result.payout });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update payout request.' },
      { status: 400 }
    );
  }
}
