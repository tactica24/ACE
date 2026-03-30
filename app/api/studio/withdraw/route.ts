import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const amountNaira = Number(body.amountNaira);

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: 'Enter a valid withdrawal amount.' }, { status: 400 });
  }

  const creator = await prisma.creatorProfile.findUnique({
    where: { userId: auth.sub }
  });

  if (!creator || !creator.verified) {
    return NextResponse.json({ error: 'Finish admin approval before withdrawing.' }, { status: 403 });
  }

  if (!creator.bankName || !creator.bankAccountName || !creator.bankAccountNumber) {
    return NextResponse.json({ error: 'Bank details are incomplete on this producer account.' }, { status: 400 });
  }

  if (creator.earningsBalanceNaira < amountNaira) {
    return NextResponse.json({ error: 'Withdrawal amount is above your producer wallet balance.' }, { status: 400 });
  }

  const payout = await prisma.$transaction(async (tx) => {
    await tx.creatorProfile.update({
      where: { id: creator.id },
      data: {
        earningsBalanceNaira: {
          decrement: amountNaira
        }
      }
    });

    return tx.creatorPayoutRequest.create({
      data: {
        creatorProfileId: creator.id,
        amountNaira,
        bankName: creator.bankName,
        bankAccountName: creator.bankAccountName,
        bankAccountNumber: creator.bankAccountNumber
      }
    });
  });

  return NextResponse.json({ ok: true, payout });
}
