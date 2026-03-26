import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { markPaymentSuccessful } from '@/lib/payment-ops';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing webhook secret', { status: 400 });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return new Response('Stripe not configured', { status: 400 });
  }

  const stripe = getStripe();
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('Ignored', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status && session.payment_status !== 'paid') {
    return new Response('Payment not settled', { status: 200 });
  }
  const reference = session.metadata?.reference;
  if (!reference) return new Response('Missing reference', { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { reference } });
  if (!payment) return new Response('Payment not found', { status: 404 });
  if (payment.status === 'SUCCESS') return new Response('OK', { status: 200 });

  const currency = (session.currency ?? payment.currency ?? 'USD').toUpperCase();
  const amountMinor = session.amount_total ?? payment.amountMinor ?? 0;
  await markPaymentSuccessful({
    reference,
    amountMinor,
    currency
  });

  return new Response('OK', { status: 200 });
}
