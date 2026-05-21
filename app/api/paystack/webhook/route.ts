import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { markPaymentFailed, markPaymentSuccessful, validateSettledPayment } from '@/lib/payment-ops';
import { verifyPaystackWebhookSignature } from '@/lib/paystack';

export const runtime = 'nodejs';

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    currency?: string;
    fees?: number;
    status?: string;
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!verifyPaystackWebhookSignature(rawBody, signature)) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent;
  } catch {
    return new Response('Invalid payload', { status: 400 });
  }

  if (event.event !== 'charge.success' || !event.data?.reference) {
    return new Response('Ignored', { status: 200 });
  }

  const payment = await prisma.payment.findUnique({ where: { reference: event.data.reference } });
  if (!payment) {
    return new Response('Payment not found', { status: 404 });
  }
  if (payment.status === 'SUCCESS' && payment.entitlementAppliedAt) {
    return new Response('OK', { status: 200 });
  }

   const currency = (event.data.currency ?? payment.currency ?? 'NGN').toUpperCase();
   // Only allow NGN currency as the wallet is in Naira
   if (currency !== 'NGN') {
     return new Response('Only NGN currency is supported', { status: 400 });
   }
   const feeMinor = typeof event.data.fees === 'number' ? event.data.fees : null;
   const amountMinor = typeof event.data.amount === 'number' ? event.data.amount : null;
   const validation = validateSettledPayment(payment, {
     amountMinor,
     currency
   });
  if (!validation.ok) {
    await markPaymentFailed(event.data.reference);
    return new Response('Payment amount mismatch', { status: 400 });
  }

  const netMinor = amountMinor !== null && feeMinor !== null ? amountMinor - feeMinor : null;

  await markPaymentSuccessful({
    reference: event.data.reference,
    amountMinor,
    currency: validation.currency,
    feeMinor,
    netMinor
  });

  return new Response('OK', { status: 200 });
}
