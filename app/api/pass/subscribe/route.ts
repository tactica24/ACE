import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { PASS_CREDITS, PASS_PRICE_NAIRA } from '@/lib/commerce';
import { initializeTransaction } from '@/lib/paystack';
import { v4 as uuid } from 'uuid';
import { getChargeForNaira } from '@/lib/pricing';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { markPaymentFailed } from '@/lib/payment-ops';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  const rateLimit = await consumeRateLimit({
    key: `pass-subscribe:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 6,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many pass checkout attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const referralCode = readReferralCode(req);
  const referral = await resolveReferral(referralCode);
  const reference = `ace_pass_${uuid()}`;
  const charge = getChargeForNaira(req, PASS_PRICE_NAIRA);
  const useStripe = charge.currency !== 'NGN';
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (useStripe && !env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  let paymentCreated = false;
  try {
    await prisma.payment.create({
      data: {
        userId: auth.sub,
        reference,
        amountNaira: PASS_PRICE_NAIRA,
        amountMinor: charge.amountMinor,
        currency: charge.currency,
        gateway: useStripe ? 'STRIPE' : 'PAYSTACK',
        referralCode: referral?.code,
        metadata: { type: 'pass', credits: PASS_CREDITS }
      }
    });
    paymentCreated = true;

    if (useStripe) {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: charge.currency.toLowerCase(),
              product_data: { name: `Ace Studio Hybrid Pass (${PASS_CREDITS} credits)` },
              unit_amount: charge.amountMinor
            },
            quantity: 1
          }
        ],
        metadata: { userId: user.id, type: 'pass', reference, credits: `${PASS_CREDITS}` },
        success_url: `${env.ACE_APP_BASE_URL}/wallet/verify?reference=${reference}`,
        cancel_url: `${env.ACE_APP_BASE_URL}/wallet`
      });
      if (!session.url) {
        throw new Error('Stripe session unavailable');
      }
      await prisma.payment.update({
        where: { reference },
        data: {
          metadata: { type: 'pass', credits: PASS_CREDITS, stripeSessionId: session.id }
        }
      });
      return NextResponse.json({ authorizationUrl: session.url, reference });
    }

    const paystack = await initializeTransaction({
      amountNaira: PASS_PRICE_NAIRA,
      email: user.email,
      reference,
      callbackUrl: `${env.ACE_APP_BASE_URL.replace(/\/+$/, '')}/wallet/verify`,
      metadata: { userId: user.id, type: 'pass', credits: PASS_CREDITS, referralCode: referral?.code ?? null }
    });

    return NextResponse.json({ authorizationUrl: paystack.data.authorization_url, reference });
  } catch (error) {
    if (paymentCreated) {
      await markPaymentFailed(reference).catch(() => null);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start pass subscription right now.' },
      { status: 500 }
    );
  }
}




