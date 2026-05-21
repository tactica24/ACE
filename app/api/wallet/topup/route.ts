import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
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
    key: `wallet-topup:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 8,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many top-up attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const amountNaira = Number(body.amountNaira || 0);
  if (!amountNaira || amountNaira < 100) {
    return NextResponse.json({ error: 'Amount too low' }, { status: 400 });
  }

  const reference = `ace_topup_${uuid()}`;
  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode);
  const charge = getChargeForNaira(req, amountNaira);
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
        amountNaira,
        amountMinor: charge.amountMinor,
        currency: charge.currency,
        gateway: useStripe ? 'STRIPE' : 'PAYSTACK',
        referralCode: referral?.code,
        metadata: { type: 'topup' }
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
              product_data: { name: 'Ace Studio Wallet Top-up' },
              unit_amount: charge.amountMinor
            },
            quantity: 1
          }
        ],
        metadata: { userId: user.id, type: 'topup', reference },
        success_url: `${env.ACE_APP_BASE_URL}/wallet/verify?reference=${reference}`,
        cancel_url: `${env.ACE_APP_BASE_URL}/wallet`
      });
      if (!session.url) {
        throw new Error('Stripe session unavailable');
      }

      await prisma.payment.update({
        where: { reference },
        data: {
          metadata: { type: 'topup', stripeSessionId: session.id }
        }
      });

      return NextResponse.json({ authorizationUrl: session.url, reference });
    }

    const paystack = await initializeTransaction({
      amountNaira,
      email: user.email,
      reference,
      metadata: { userId: user.id, type: 'topup', referralCode: referral?.code ?? null }
    });

    return NextResponse.json({ authorizationUrl: paystack.data.authorization_url, reference });
  } catch (error) {
    if (paymentCreated) {
      await markPaymentFailed(reference).catch(() => null);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start top-up right now.' },
      { status: 500 }
    );
  }
}




