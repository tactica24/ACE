import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRegionalCurrency } from '@/lib/pricing';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

function normalizePhone(phone: string) {
  return phone.trim();
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  const rateLimit = await consumeRateLimit({
    key: `family-share:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 20,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many family share attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const { region } = getRegionalCurrency(req);
  if (region !== 'DIASPORA') {
    return NextResponse.json({ error: 'Family sharing from wallet credits or balance is available for diaspora accounts only.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const recipientPhone = normalizePhone(typeof body?.recipientPhone === 'string' ? body.recipientPhone : '');
  const shareType = body?.shareType === 'BALANCE' ? 'BALANCE' : 'CREDITS';
  const amount = Math.floor(Number(body?.amount ?? 0));

  if (!recipientPhone) {
    return NextResponse.json({ error: 'Enter the family member phone number.' }, { status: 400 });
  }

  if (recipientPhone === auth.phone) {
    return NextResponse.json({ error: 'Use a different phone number for family sharing.' }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: shareType === 'CREDITS' ? 'Enter the number of credits to share.' : 'Enter the wallet amount to share.' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const recipient = await tx.user.findFirst({
        where: { phone: recipientPhone },
        select: { id: true, name: true, phone: true }
      });

      if (!recipient) {
        throw new Error('That phone number is not linked to an Ace Studio account yet.');
      }

      const senderWallet = await tx.wallet.findUnique({ where: { userId: auth.sub } });
      if (!senderWallet) {
        throw new Error('Wallet not found.');
      }

      await tx.wallet.upsert({
        where: { userId: recipient.id },
        update: {},
        create: { userId: recipient.id }
      });

      if (shareType === 'CREDITS') {
        if (senderWallet.credits < amount) {
          throw new Error('You do not have enough credits to share that amount.');
        }

        await tx.wallet.update({
          where: { userId: auth.sub },
          data: { credits: { decrement: amount } }
        });
        await tx.wallet.update({
          where: { userId: recipient.id },
          data: { credits: { increment: amount } }
        });
      } else {
        if (senderWallet.balanceNaira < amount) {
          throw new Error('You do not have enough wallet balance to share that amount.');
        }

        await tx.wallet.update({
          where: { userId: auth.sub },
          data: { balanceNaira: { decrement: amount } }
        });
        await tx.wallet.update({
          where: { userId: recipient.id },
          data: { balanceNaira: { increment: amount } }
        });
      }

      const existingLink = await tx.familyLink.findFirst({
        where: { ownerId: auth.sub, recipientPhone }
      });

      if (!existingLink) {
        await tx.familyLink.create({
          data: {
            ownerId: auth.sub,
            recipientPhone
          }
        });
      }

      const updatedSenderWallet = await tx.wallet.findUnique({
        where: { userId: auth.sub },
        select: { balanceNaira: true, credits: true }
      });

      return {
        recipient,
        wallet: updatedSenderWallet
      };
    });

    return NextResponse.json({
      ok: true,
      shareType,
      wallet: result.wallet,
      message:
        shareType === 'CREDITS'
          ? `${amount} credits shared with ${result.recipient.name ?? result.recipient.phone}.`
          : `NGN ${amount} shared with ${result.recipient.name ?? result.recipient.phone}.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to share with family right now.' },
      { status: 400 }
    );
  }
}
