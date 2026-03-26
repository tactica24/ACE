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

  const payout = await prisma.creatorPayoutRequest.findUnique({
    where: { id: payoutRequestId },
    include: { creatorProfile: true }
  });

  if (!payout) {
    return NextResponse.json({ error: 'Payout request not found.' }, { status: 404 });
  }

  if (action === 'approve') {
    await prisma.creatorPayoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: 'APPROVED',
        adminNote: adminNote || null,
        reviewerId: auth.sub,
        reviewedAt: new Date()
      }
    });
  }

  if (action === 'reject') {
    await prisma.$transaction([
      prisma.creatorPayoutRequest.update({
        where: { id: payoutRequestId },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          reviewerId: auth.sub,
          reviewedAt: new Date()
        }
      }),
      prisma.creatorProfile.update({
        where: { id: payout.creatorProfileId },
        data: {
          earningsBalanceNaira: {
            increment: payout.amountNaira
          }
        }
      })
    ]);
  }

  if (action === 'mark_paid') {
    await prisma.creatorPayoutRequest.update({
      where: { id: payoutRequestId },
      data: {
        status: 'PAID',
        adminNote: adminNote || null,
        reviewerId: auth.sub,
        reviewedAt: payout.reviewedAt ?? new Date(),
        paidAt: new Date()
      }
    });
  }

  return NextResponse.json({ ok: true });
}
