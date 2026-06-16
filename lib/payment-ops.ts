import { Prisma } from '@prisma/client';
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
    entitlementAppliedAt: true;
  };
}>;

type SettledPaymentCheck = {
  amountMinor?: number | null;
  currency?: string | null;
};

function getPaymentMetadata(payment: PaymentRecord) {
  return (payment.metadata as {
    type?: string;
    recipientUserId?: string;
    stripeSessionId?: string;
  } | null) ?? null;
}

export function validateSettledPayment(payment: Pick<PaymentRecord, 'amountMinor' | 'currency'>, settled: SettledPaymentCheck) {
  const expectedCurrency = (payment.currency ?? 'NGN').toUpperCase();
  const settledCurrency = (settled.currency ?? payment.currency ?? 'NGN').toUpperCase();

  if (settledCurrency !== expectedCurrency) {
    return { ok: false as const, reason: 'CURRENCY_MISMATCH', currency: settledCurrency };
  }

  if (
    typeof settled.amountMinor === 'number' &&
    typeof payment.amountMinor === 'number' &&
    payment.amountMinor > 0 &&
    settled.amountMinor < payment.amountMinor
  ) {
    return { ok: false as const, reason: 'AMOUNT_MISMATCH', currency: settledCurrency };
  }

  return { ok: true as const, currency: settledCurrency };
}

async function applyPaymentEntitlement(tx: Prisma.TransactionClient, payment: PaymentRecord) {
  const metadata = getPaymentMetadata(payment);
  const type = metadata?.type;

  if (type === 'pass') {
    await tx.wallet.upsert({
      where: { userId: payment.userId },
      update: { balanceNaira: { increment: payment.amountNaira } },
      create: { userId: payment.userId, balanceNaira: payment.amountNaira }
    });
    return;
  }

  if (type === 'family') {
    if (metadata?.recipientUserId) {
      await tx.wallet.upsert({
        where: { userId: metadata.recipientUserId },
        update: { balanceNaira: { increment: payment.amountNaira } },
        create: { userId: metadata.recipientUserId, balanceNaira: payment.amountNaira }
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
          metadata: true,
          entitlementAppliedAt: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCESS' && payment.entitlementAppliedAt) {
        return { payment, credited: false };
      }

      const updatedPayment = payment.status === 'SUCCESS'
        ? payment
        : await tx.payment.update({
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
              metadata: true,
              entitlementAppliedAt: true
            }
          });

      await applyPaymentEntitlement(tx, updatedPayment);
      await applyReferralEvent(tx, updatedPayment);
      const creditedPayment = await tx.payment.update({
        where: { reference },
        data: { entitlementAppliedAt: new Date() },
        select: {
          id: true,
          userId: true,
          reference: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          referralCode: true,
          status: true,
          metadata: true,
          entitlementAppliedAt: true
        }
      });

      return { payment: creditedPayment, credited: true };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function markPaymentFailed(reference: string) {
  return markPaymentUnsuccessful(reference, 'FAILED');
}

export async function markPaymentAbandoned(reference: string) {
  return markPaymentUnsuccessful(reference, 'ABANDONED');
}

async function markPaymentUnsuccessful(reference: string, status: 'FAILED' | 'ABANDONED') {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment:${reference}`}))`;

      const payment = await tx.payment.findUnique({
        where: { reference },
        select: {
          id: true,
          status: true
        }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status === 'SUCCESS' || payment.status === status) {
        return payment;
      }

      return tx.payment.update({
        where: { reference },
        data: { status }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
