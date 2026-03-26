import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { getFamilyPassPrice } from '@/lib/pricing';
import { env } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { v4 as uuid } from 'uuid';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  const rateLimit = consumeRateLimit({
    key: `family-pass:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 6,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many family checkout attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const recipientPhone = body.recipientPhone as string | undefined;
  if (!recipientPhone) return NextResponse.json({ error: 'Missing recipientPhone' }, { status: 400 });

  const recipient = await prisma.user.findFirst({ where: { phone: recipientPhone } });
  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });

  const credits = Number(env.ACE_FAMILY_PASS_CREDITS ?? 50);
  const price = getFamilyPassPrice(req);
  if (price.region === 'NG' || price.amountMinor <= 0) {
    return NextResponse.json({ error: 'Family pass is only available for diaspora purchases.' }, { status: 400 });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
  }

  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode);
  const reference = `ace_family_${uuid()}`;

  await prisma.payment.create({
    data: {
      userId: auth.sub,
      reference,
      amountNaira: price.amountNaira,
      amountMinor: price.amountMinor,
      currency: price.currency,
      gateway: 'STRIPE',
      referralCode: referral?.code,
      metadata: {
        type: 'family',
        recipientUserId: recipient.id,
        recipientPhone,
        credits
      }
    }
  });

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: auth.email,
    line_items: [
        {
          price_data: {
            currency: price.currency.toLowerCase(),
            product_data: { name: `Ace Studio Home Bundle (${credits} credits)` },
            unit_amount: price.amountMinor
          },
          quantity: 1
        }
    ],
    metadata: { userId: auth.sub, type: 'family', reference, recipientUserId: recipient.id, credits: `${credits}` },
    success_url: `${env.ACE_APP_BASE_URL}/wallet/verify?reference=${reference}`,
    cancel_url: `${env.ACE_APP_BASE_URL}/wallet`
  });
  if (!session.url) {
    return NextResponse.json({ error: 'Stripe session unavailable' }, { status: 500 });
  }

  await prisma.payment.update({
    where: { reference },
    data: {
      metadata: {
        type: 'family',
        recipientUserId: recipient.id,
        recipientPhone,
        credits,
        stripeSessionId: session.id
      }
    }
  });

  await prisma.familyLink.create({
    data: {
      ownerId: auth.sub,
      recipientPhone
    }
  }).catch(() => null);

  return NextResponse.json({ authorizationUrl: session.url, reference });
}
