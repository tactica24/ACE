import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { verifyTransaction } from '@/lib/paystack';
import { markPaymentFailed, markPaymentSuccessful, validateSettledPayment } from '@/lib/payment-ops';
import { getStripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const reference = body.reference as string | undefined;
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment || payment.userId !== auth.sub) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }

  if (payment.gateway === 'STRIPE') {
    if (payment.status === 'SUCCESS' && payment.entitlementAppliedAt) return NextResponse.json({ ok: true, credited: false });
    if (payment.status === 'FAILED') {
      return NextResponse.json({ error: 'Payment failed' }, { status: 400 });
    }

    const metadata = (payment.metadata as { stripeSessionId?: string } | null) ?? null;
    if (!metadata?.stripeSessionId) {
      return NextResponse.json({ status: 'pending' }, { status: 202 });
    }

    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(metadata.stripeSessionId);

      if (session.payment_status === 'paid') {
        const amountMinor = session.amount_total ?? payment.amountMinor;
        const currency = session.currency?.toUpperCase() ?? payment.currency;
        const validation = validateSettledPayment(payment, { amountMinor, currency });
        if (!validation.ok) {
          await markPaymentFailed(reference);
          return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
        }

        await markPaymentSuccessful({
          reference,
          amountMinor,
          currency: validation.currency
        });

        return NextResponse.json({ ok: true, credited: true });
      }

      if (session.status === 'expired') {
        await markPaymentFailed(reference);
        return NextResponse.json({ error: 'Payment failed' }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ status: 'pending' }, { status: 202 });
    }

    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }

  if (payment.status === 'SUCCESS' && payment.entitlementAppliedAt) {
    return NextResponse.json({ ok: true, credited: false });
  }

  const verification = await verifyTransaction(reference);
  if (!verification.status) {
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }
  if (verification.data.status !== 'success') {
    if (verification.data.status === 'failed' || verification.data.status === 'abandoned') {
      await markPaymentFailed(reference);
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }

    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }

  const validation = validateSettledPayment(payment, {
    amountMinor: verification.data.amount,
    currency: verification.data.currency ?? payment.currency
  });
  if (!validation.ok) {
    await markPaymentFailed(reference);
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
  }

  const feeMinor = typeof verification.data.fees === 'number' ? verification.data.fees : null;
  const amountMinor = verification.data.amount;
  const netMinor = feeMinor === null ? null : amountMinor - feeMinor;
  await markPaymentSuccessful({
    reference,
    amountMinor,
    currency: validation.currency,
    feeMinor,
    netMinor
  });

  return NextResponse.json({ ok: true, credited: true });
}
