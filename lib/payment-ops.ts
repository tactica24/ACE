import { Prisma } from '@prisma/client';
import { DEFAULT_FAMILY_BUNDLE_CREDITS, PASS_CREDITS } from '@/lib/commerce';
import { prisma } from '@/lib/db';

type PaymentRecord = Prisma.PaymentGetPayload<{
  select: {
    id: true;
    userId: true;
    reference: true;
    amountNaira: true;
    amountMinor: true;
    currency: true;
    referralCode: true;
    status: true;
    metadata: true;
  };
}>;

function getPaymentMetadata(payment: PaymentRecord) {
  return (payment.metadata as {
    type?: string;
    recipientUserId?: string;
    credits?: number | string;
    stripeSessionId?: string;
  } | null) ?? null;
}

async function applyPaymentEntitlement(tx: Prisma.TransactionClient, payment: PaymentRecord) {
  const metadata = getPaymentMetadata(payment);
  const type = metadata?.type;

  if (type === 'pass') {
    const credits = Number(metadata?.credits ?? PASS_CREDITS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await tx.subscriptionPass.create({
      data: {
        userId: payment.userId,
        creditsRemaining: credits,
        expiresAt
      }
    });
    return;
  }

  if (type === 'family') {
    const credits = Number(metadata?.credits ?? DEFAULT_FAMILY_BUNDLE_CREDITS);
    if (metadata?.recipientUserId) {
      await tx.wallet.upsert({
        where: { userId: metadata.recipientUserId },
        update: { credits: { increment: credits } },
        create: { userId: metadata.recipientUserId, credits }
      });
    }
    return;
  }

  await tx.wallet.upsert({
    where: { userId: payment.userId },
    update: { balanceNaira: { increment: payment.amountNaira } },
    create: { userId: payment.userId, balanceNaira: payment.amountNaira }
  });
}

async function applyReferralEvent(tx: Prisma.TransactionClient, payment: PaymentRecord) {
  if (!payment.referralCode) {
    return;
  }

  const referral = await tx.referralLink.findUnique({ where: { code: payment.referralCode } });
  if (!referral) {
    return;
  }

  const existing = await tx.referralEvent.findFirst({ where: { paymentId: payment.id } });
  if (existing) {
    return;
  }

  await tx.referralEvent.create({
    data: {
      referralId: referral.id,
      paymentId: payment.id,
      commissionNaira: 0
    }
  });
}

export async function markPaymentSuccessful({
  reference,
  amountMinor,
  currency,
  feeMinor = null,
  netMinor = null
}: {
  reference: string;
  amountMinor?: number | null;
  currency?: string | null;
  feeMinor?: number | null;
  netMinor?: number | null;
}) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${reference}`}))`;

      const payment = await tx.payment.findUnique({
        where: { reference },
        select: {
          id: true,
          userId: true,
          reference: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          referralCode: true,
          status: true,
          metadata: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCESS') {
        return { payment, credited: false };
      }

      const updatedPayment = await tx.payment.update({
        where: { reference },
        data: {
          status: 'SUCCESS',
          amountMinor: amountMinor ?? payment.amountMinor,
          currency: currency ?? payment.currency,
          feeMinor,
          netMinor
        },
        select: {
          id: true,
          userId: true,
          reference: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          referralCode: true,
          status: true,
          metadata: true
        }
      });

      await applyPaymentEntitlement(tx, updatedPayment);
      await applyReferralEvent(tx, updatedPayment);

      return { payment: updatedPayment, credited: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function markPaymentFailed(reference: string) {
  return prisma.payment.update({
    where: { reference },
    data: { status: 'FAILED' }
  });
}
