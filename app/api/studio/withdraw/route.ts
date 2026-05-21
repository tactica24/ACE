import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'CREATOR') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const amountNaira = Math.round(Number(body.amountNaira));

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: 'Enter a valid withdrawal amount.' }, { status: 400 });
  }

  try {
    const payout = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`creator-withdraw:${auth.sub}`}))`;

        const creator = await tx.creatorProfile.findUnique({
          where: { userId: auth.sub }
        });

        if (!creator || !creator.verified) {
          throw new Error('Finish admin approval before withdrawing.');
        }

        if (!creator.bankName || !creator.bankAccountName || !creator.bankAccountNumber) {
          throw new Error('Bank details are incomplete on this producer account.');
        }

        if (creator.earningsBalanceNaira < amountNaira) {
          throw new Error('Withdrawal amount is above your producer wallet balance.');
        }

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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ ok: true, payout });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to submit withdrawal.' },
      { status: 400 }
    );
  }
}
