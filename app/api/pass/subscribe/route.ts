import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { initializeTransaction } from '@/lib/paystack';
import { v4 as uuid } from 'uuid';
import { getChargeForNaira } from '@/lib/pricing';
import { getStripe } from '@/lib/stripe';
import { env } from '@/lib/env';
import { readReferralCode, resolveReferral } from '@/lib/referrals';

const PASS_PRICE = 2500;

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  const referralCode = readReferralCode(req);
  const referral = await resolveReferral(referralCode);
  const reference = `ace_pass_${uuid()}`;
  const charge = getChargeForNaira(req, PASS_PRICE);
  const useStripe = charge.currency !== 'NGN';
  await prisma.payment.create({
    data: {
      userId: auth.sub,
      reference,
      amountNaira: PASS_PRICE,
      amountMinor: charge.amountMinor,
      currency: charge.currency,
      gateway: useStripe ? 'STRIPE' : 'PAYSTACK',
      referralCode: referral?.code,
      metadata: { type: 'pass' }
    }
  });

  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (useStripe) {
    if (!env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
    }
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: charge.currency.toLowerCase(),
            product_data: { name: 'Ace Studio Hybrid Pass' },
            unit_amount: charge.amountMinor
          },
          quantity: 1
        }
      ],
      metadata: { userId: user.id, type: 'pass', reference },
      success_url: `${env.ACE_APP_BASE_URL}/wallet/verify?reference=${reference}`,
      cancel_url: `${env.ACE_APP_BASE_URL}/wallet`
    });
    if (!session.url) {
      return NextResponse.json({ error: 'Stripe session unavailable' }, { status: 500 });
    }
    return NextResponse.json({ authorizationUrl: session.url, reference });
  }

  const paystack = await initializeTransaction({
    amountNaira: PASS_PRICE,
    email: user.email,
    reference,
    metadata: { userId: user.id, type: 'pass', referralCode: referral?.code ?? null }
  });

  return NextResponse.json({ authorizationUrl: paystack.data.authorization_url, reference });
}




