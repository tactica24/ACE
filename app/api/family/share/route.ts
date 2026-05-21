import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { creditsToStoredUnits, storedUnitsToCredits } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { getRegionalCurrency } from '@/lib/pricing';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
  const recipientEmail = normalizeEmail(typeof body?.recipientEmail === 'string' ? body.recipientEmail : '');
  const shareType = body?.shareType === 'BALANCE' ? 'BALANCE' : 'CREDITS';
  const rawAmount = Number(body?.amount ?? 0);
  const amount = shareType === 'CREDITS' ? creditsToStoredUnits(rawAmount) : Math.floor(rawAmount);

  if (!recipientEmail) {
    return NextResponse.json({ error: 'Enter the family member email address.' }, { status: 400 });
  }

  if (recipientEmail === auth.email.toLowerCase()) {
    return NextResponse.json({ error: 'Use a different email address for family sharing.' }, { status: 400 });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: shareType === 'CREDITS' ? 'Enter the number of credits to share.' : 'Enter the wallet amount to share.' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`family-share:${auth.sub}`}))`;

        const recipient = await tx.user.findUnique({
          where: { email: recipientEmail },
          select: { id: true, name: true, email: true }
        });

        if (!recipient) {
          throw new Error('That email address is not linked to an Ace Studio account yet.');
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
          where: { ownerId: auth.sub, recipientEmail }
        });

        if (!existingLink) {
          await tx.familyLink.create({
            data: {
              ownerId: auth.sub,
              recipientEmail
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      ok: true,
      shareType,
      wallet: result.wallet
        ? { ...result.wallet, credits: storedUnitsToCredits(result.wallet.credits) }
        : result.wallet,
      message:
        shareType === 'CREDITS'
          ? `${storedUnitsToCredits(amount)} credits shared with ${result.recipient.name ?? result.recipient.email}.`
          : `NGN ${amount} shared with ${result.recipient.name ?? result.recipient.email}.`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to share with family right now.' },
      { status: 400 }
    );
  }
}
