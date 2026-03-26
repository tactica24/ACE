import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { creditWallet } from '@/lib/wallet';
import { env } from '@/lib/env';

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
    credits?: number;
    stripeSessionId?: string;
  } | null) ?? null;
}

async function applyPaymentEntitlement(payment: PaymentRecord) {
  const metadata = getPaymentMetadata(payment);
  const type = metadata?.type;

  if (type === 'pass') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.subscriptionPass.create({
      data: {
        userId: payment.userId,
        creditsRemaining: 30,
        expiresAt
      }
    });
    return;
  }

  if (type === 'family') {
    const credits = Number(metadata?.credits ?? env.ACE_FAMILY_PASS_CREDITS ?? 50);
    if (metadata?.recipientUserId) {
      await prisma.wallet.update({
        where: { userId: metadata.recipientUserId },
        data: { credits: { increment: credits } }
      });
    }
    return;
  }

  await creditWallet(payment.userId, payment.amountNaira);
}

async function applyReferralEvent(payment: PaymentRecord) {
  if (!payment.referralCode) {
    return;
  }

  const referral = await prisma.referralLink.findUnique({ where: { code: payment.referralCode } });
  if (!referral) {
    return;
  }

  const existing = await prisma.referralEvent.findFirst({ where: { paymentId: payment.id } });
  if (existing) {
    return;
  }

  await prisma.referralEvent.create({
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
  const payment = await prisma.payment.findUnique({
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

  const updatedPayment = await prisma.payment.update({
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

  await applyPaymentEntitlement(updatedPayment);
  await applyReferralEvent(updatedPayment);

  return { payment: updatedPayment, credited: true };
}

export async function markPaymentFailed(reference: string) {
  return prisma.payment.update({
    where: { reference },
    data: { status: 'FAILED' }
  });
}
