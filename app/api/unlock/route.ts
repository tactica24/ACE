import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { calculateUnlockSplit, getFinanceConfig, getPlatformWallet } from '@/lib/finance';
import { debitWallet, usePassCredit as consumePassCredit, useWalletCredit as consumeWalletCredit } from '@/lib/wallet';
import { getRegionalPrice } from '@/lib/pricing';
import { readReferralCode, resolveReferral } from '@/lib/referrals';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const price = getRegionalPrice(req, video.priceTier);
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
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
      }
    }
  }

  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);
  const financeConfig = await getFinanceConfig();
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
        watermarkText: `${auth.phone} / ${auth.email}`,
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

  return NextResponse.json({ ok: true, unlocked: true });
}
