import { prisma } from '@/lib/db';
import { verifyTransaction } from '@/lib/paystack';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { markPaymentFailed, markPaymentSuccessful, validateSettledPayment } from '@/lib/payment-ops';

const STALE_PENDING_MINUTES = 15;

function getStalePendingCutoff() {
  return new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000);
}

export async function getReconciliationSummary() {
  const staleCutoff = getStalePendingCutoff();
  const [pendingPayments, stalePendingPayments, failedPayments, pendingPaymentRecords] = await Promise.all([
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'PENDING', createdAt: { lt: staleCutoff } } }),
    prisma.payment.count({ where: { status: 'FAILED' } }),
    prisma.payment.findMany({
      where: { status: 'PENDING' },
      select: { metadata: true }
    })
  ]);

  return {
    pendingPayments,
    stalePendingPayments,
    failedPayments,
    pendingFamilyTransfers: pendingPaymentRecords.filter((payment) => {
      const metadata = payment.metadata as { type?: string } | null;
      return metadata?.type === 'family';
    }).length
  };
}

export async function reconcilePendingCommerce() {
  const staleCutoff = getStalePendingCutoff();
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: staleCutoff }
    },
    orderBy: { createdAt: 'asc' },
    take: 25
  });

  let reconciled = 0;
  let failed = 0;
  let stillPending = 0;

  for (const payment of pendingPayments) {
    try {
      if (payment.gateway === 'PAYSTACK') {
        const verification = await verifyTransaction(payment.reference);
        if (verification.status && verification.data.status === 'success') {
          const feeMinor = typeof verification.data.fees === 'number' ? verification.data.fees : null;
          const amountMinor = verification.data.amount;
          const validation = validateSettledPayment(payment, {
            amountMinor,
            currency: verification.data.currency ?? payment.currency
          });
          if (!validation.ok) {
            await markPaymentFailed(payment.reference);
            failed += 1;
            continue;
          }
          const netMinor = feeMinor === null ? null : amountMinor - feeMinor;
          await markPaymentSuccessful({
            reference: payment.reference,
            amountMinor,
            currency: validation.currency,
            feeMinor,
            netMinor
          });
          reconciled += 1;
          continue;
        }

        if (verification.data.status === 'failed' || verification.data.status === 'abandoned') {
          await markPaymentFailed(payment.reference);
          failed += 1;
          continue;
        }

        stillPending += 1;
        continue;
      }

      const metadata = (payment.metadata as { stripeSessionId?: string } | null) ?? null;
      if (!metadata?.stripeSessionId || !env.STRIPE_SECRET_KEY) {
        stillPending += 1;
        continue;
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(metadata.stripeSessionId);

      if (session.payment_status === 'paid') {
        const validation = validateSettledPayment(payment, {
          amountMinor: session.amount_total ?? payment.amountMinor,
          currency: session.currency?.toUpperCase() ?? payment.currency
        });
        if (!validation.ok) {
          await markPaymentFailed(payment.reference);
          failed += 1;
          continue;
        }
        await markPaymentSuccessful({
          reference: payment.reference,
          amountMinor: session.amount_total ?? payment.amountMinor,
          currency: validation.currency
        });
        reconciled += 1;
        continue;
      }

      if (session.status === 'expired') {
        await markPaymentFailed(payment.reference);
        failed += 1;
        continue;
      }

      stillPending += 1;
    } catch {
      stillPending += 1;
    }
  }

  return {
    scanned: pendingPayments.length,
    reconciled,
    failed,
    stillPending
  };
}
