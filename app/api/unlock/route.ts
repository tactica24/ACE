import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { debitWallet, usePassCredit, useWalletCredit } from '@/lib/wallet';
import { getRegionalPrice } from '@/lib/pricing';
import { readReferralCode, resolveReferral } from '@/lib/referrals';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

  const existing = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId } });
  if (existing) return NextResponse.json({ ok: true, unlocked: true });

  const price = getRegionalPrice(req, video.priceTier);
  let source: 'PASS' | 'WALLET' = 'WALLET';

  const pass = await usePassCredit(auth.sub);
  if (pass) {
    source = 'PASS';
  } else {
    const credit = await useWalletCredit(auth.sub);
    if (credit) {
      source = 'PASS';
    } else {
      try {
        await debitWallet(auth.sub, price.amountNaira);
      } catch (err) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 402 });
      }
    }
  }

  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);

  const unlock = await prisma.unlock.create({
    data: {
      userId: auth.sub,
      videoId,
      amountNaira: price.amountNaira,
      amountMinor: price.amountMinor,
      currency: price.currency,
      source,
      watermarkText: `${auth.phone} · ${auth.email}`,
      referralCode: referral?.code
    }
  });

  if (referral) {
    const platformShare = Math.round(price.amountNaira * 0.4);
    const commissionNaira = Math.round(platformShare * (referral.commissionPercent / 100));
    await prisma.$transaction([
      prisma.referralEvent.create({
        data: {
          referralId: referral.id,
          unlockId: unlock.id,
          commissionNaira
        }
      }),
      prisma.wallet.update({
        where: { userId: referral.promoterId },
        data: { balanceNaira: { increment: commissionNaira } }
      })
    ]);
  }

  return NextResponse.json({ ok: true, unlocked: true });
}




