import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { calculateUnlockSplit, getFinanceConfig, getPlatformWallet } from '@/lib/finance';
import { debitWallet, usePassCredit as consumePassCredit, useWalletCredit as consumeWalletCredit } from '@/lib/wallet';
import { getRegionalPriceFromConfig } from '@/lib/pricing';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE, reason: 'EMAIL_VERIFICATION_REQUIRED' }, { status: 403 });
  }

  const rateLimit = await consumeRateLimit({
    key: `unlock:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 40,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many unlock attempts. Please wait a moment and try again.', reason: 'RATE_LIMITED' }, { status: 429 });
  }

  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { creator: { include: { creator: true } } }
  });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  const existing = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId } });
  if (existing) return NextResponse.json({ ok: true, unlocked: true });

  const financeConfig = await getFinanceConfig();
  const price = getRegionalPriceFromConfig(req, video.priceTier, financeConfig);
  let source: 'PASS' | 'WALLET' = 'WALLET';

  const pass = await consumePassCredit(auth.sub);
  if (pass) {
    source = 'PASS';
  } else {
    const credit = await consumeWalletCredit(auth.sub);
    if (credit) {
      source = 'WALLET';
    } else {
      try {
        await debitWallet(auth.sub, price.amountNaira);
      } catch {
        return NextResponse.json({ error: 'Insufficient balance', reason: 'INSUFFICIENT_BALANCE' }, { status: 402 });
      }
    }
  }

  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);
  await getPlatformWallet();
  const split = calculateUnlockSplit(price.amountNaira, financeConfig);
  const creatorProfileId = video.creator.creator?.id ?? null;
  const creatorNaira = creatorProfileId ? split.creatorNaira : 0;
  const referralNaira = referral ? Math.round(split.platformNaira * (referral.commissionPercent / 100)) : 0;
  const platformNetNaira = Math.max(split.platformNaira - referralNaira, 0);

  await prisma.$transaction(async (tx) => {
    const unlock = await tx.unlock.create({
      data: {
        userId: auth.sub,
        videoId,
        amountNaira: price.amountNaira,
        amountMinor: price.amountMinor,
        currency: price.currency,
        source,
        watermarkText: auth.name?.trim() || auth.email.split('@')[0] || auth.email,
        referralCode: referral?.code
      }
    });

    await tx.platformWallet.upsert({
      where: { id: 'ace-platform' },
      update: { balanceNaira: { increment: platformNetNaira } },
      create: { id: 'ace-platform', balanceNaira: platformNetNaira }
    });

    if (creatorProfileId && creatorNaira > 0) {
      await tx.creatorProfile.update({
        where: { id: creatorProfileId },
        data: { earningsBalanceNaira: { increment: creatorNaira } }
      });
    }

    await tx.unlockSettlement.create({
      data: {
        unlockId: unlock.id,
        videoId,
        creatorProfileId,
        grossNaira: price.amountNaira,
        creatorNaira,
        platformNaira: split.platformNaira,
        gatewayFeeNaira: split.gatewayFeeNaira,
        taxNaira: split.taxNaira,
        referralNaira,
        platformNetNaira: platformNetNaira
      }
    });

    if (referral) {
      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          unlockId: unlock.id,
          commissionNaira: referralNaira
        }
      });
      await tx.wallet.update({
        where: { userId: referral.promoterId },
        data: { balanceNaira: { increment: referralNaira } }
      });
    }
  });

  return NextResponse.json({ ok: true, unlocked: true, source });
}
