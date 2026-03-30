import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { verifyTransaction } from '@/lib/paystack';
import { markPaymentFailed, markPaymentSuccessful } from '@/lib/payment-ops';

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
    if (payment.status === 'SUCCESS') return NextResponse.json({ ok: true, credited: false });
    if (payment.status === 'FAILED') {
      return NextResponse.json({ error: 'Payment failed' }, { status: 400 });
    }
    return NextResponse.json({ status: 'pending' }, { status: 202 });
  }

  if (payment.status === 'SUCCESS') {
    return NextResponse.json({ ok: true, credited: false });
  }

  const verification = await verifyTransaction(reference);
  if (!verification.status || verification.data.status !== 'success') {
    await markPaymentFailed(reference);
    return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
  }

  const amountNaira = Math.round(verification.data.amount / 100);
  if (amountNaira < payment.amountNaira) {
    await markPaymentFailed(reference);
    return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
  }

  const feeMinor = typeof verification.data.fees === 'number' ? verification.data.fees : null;
  const amountMinor = verification.data.amount;
  const netMinor = feeMinor === null ? null : amountMinor - feeMinor;
  await markPaymentSuccessful({
    reference,
    amountMinor,
    currency: verification.data.currency ?? 'NGN',
    feeMinor,
    netMinor
  });

  return NextResponse.json({ ok: true, credited: true });
}
