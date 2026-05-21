import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { CREDIT_VALUE_NAIRA, getCreditUnitsForNaira, getCreditsForNaira } from '@/lib/credits';
import { calculateUnlockSplit, getFinanceConfig } from '@/lib/finance';
import { getPlaybackAssetSnapshot } from '@/lib/playback-assets';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { isSeriesContainer } from '@/lib/video-access';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';
import { planUnlockDebit } from '@/lib/unlock-debit';
import { getVideoAvailabilityDecision } from '@/lib/video-availability';
import { revalidatePath } from 'next/cache';

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
    include: {
      creator: { include: { creator: true } },
      technicalMetadata: {
        select: {
          availabilityRegion: true,
          masterKey: true
        }
      }
    }
  });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (!['APPROVED', 'PUBLISHED'].includes(video.status)) {
    return NextResponse.json({ error: 'This title is not available for unlock yet.' }, { status: 403 });
  }
  if (isSeriesContainer(video)) {
    return NextResponse.json({ error: 'Select an episode to unlock and watch.' }, { status: 400 });
  }
  const availability = getVideoAvailabilityDecision(video.technicalMetadata?.availabilityRegion, req);
  if (!availability.allowed) {
    return NextResponse.json({
      error: 'This title is licensed for Africa only and cannot be unlocked from your current location.',
      reason: 'GEO_BLOCKED',
      availabilityRegion: availability.region,
      country: availability.country
    }, { status: 403 });
  }

  const assetSnapshot = await getPlaybackAssetSnapshot(video.id, video.r2Key ?? video.technicalMetadata?.masterKey, video.fallbackR2Key);
  if (!assetSnapshot.ready) {
    return NextResponse.json({
      error: assetSnapshot.storageConfigured
        ? 'This title is not ready for playback yet.'
        : 'Playback storage is not configured yet for this title.'
    }, { status: 409 });
  }

  const financeConfig = await getFinanceConfig();
  const amountNaira = getUnlockAmountNairaForVideo(video, financeConfig);
  const creditsRequiredUnits = getCreditUnitsForNaira(amountNaira);
  const creditsRequired = getCreditsForNaira(amountNaira);
  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);
  const split = calculateUnlockSplit(amountNaira, financeConfig, {
    creatorSharePercent: video.producerRevenueShare,
    platformSharePercent: video.platformRevenueShare,
    taxPercent: video.taxRevenueShare
  });
  const creatorProfileId = video.creator.creator?.id ?? null;
  const creatorNaira = creatorProfileId ? split.creatorNaira : 0;
  const referralNaira = referral ? Math.round(split.platformNaira * (referral.commissionPercent / 100)) : 0;
  const platformNetNaira = Math.max(split.platformNaira - referralNaira, 0);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`unlock:${auth.sub}:${videoId}`}))`;

        const existing = await tx.unlock.findFirst({ where: { userId: auth.sub, videoId } });
        if (existing) {
          return { unlocked: true, source: existing.source };
        }

        let source: 'PASS' | 'WALLET' = 'WALLET';
        const activePasses = await tx.subscriptionPass.findMany({
          where: { userId: auth.sub, expiresAt: { gt: new Date() }, creditsRemaining: { gt: 0 } },
          orderBy: { expiresAt: 'asc' }
        });
        const wallet = await tx.wallet.findUnique({ where: { userId: auth.sub } });
        const debitPlan = planUnlockDebit({
          creditsRequiredUnits,
          passCreditsRemainingUnits: activePasses.map((pass) => pass.creditsRemaining),
          walletCreditsUnits: wallet?.credits ?? 0,
          walletBalanceNaira: wallet?.balanceNaira ?? 0
        });

        for (let index = 0; index < activePasses.length; index += 1) {
          const usage = debitPlan.passUsageUnits[index] ?? 0;
          if (usage <= 0) {
            continue;
          }

          await tx.subscriptionPass.update({
            where: { id: activePasses[index].id },
            data: { creditsRemaining: { decrement: usage } }
          });
        }

        const walletCreditUnitsUsed = debitPlan.walletCreditUnitsUsed;
        const walletBalanceNeeded = debitPlan.walletBalanceNeeded;

        if (!debitPlan.sufficientBalance) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        if (walletCreditUnitsUsed > 0 || walletBalanceNeeded > 0) {
          if (!wallet) {
            throw new Error('INSUFFICIENT_BALANCE');
          }

          await tx.wallet.update({
            where: { userId: auth.sub },
            data: {
              credits: walletCreditUnitsUsed > 0 ? { decrement: walletCreditUnitsUsed } : undefined,
              balanceNaira: walletBalanceNeeded > 0 ? { decrement: walletBalanceNeeded } : undefined
            }
          });
        }

        source = debitPlan.source;

        const unlock = await tx.unlock.create({
          data: {
            userId: auth.sub,
            videoId,
            amountNaira,
            amountMinor: amountNaira * 100,
            currency: 'NGN',
            source,
            watermarkText: auth.name?.trim() || auth.email.split('@')[0] || auth.email,
            referralCode: referral?.code
          }
        });

        await tx.video.update({
          where: { id: videoId },
          data: { totalUnlocks: { increment: 1 } }
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
            grossNaira: amountNaira,
            creatorNaira,
            platformNaira: split.platformNaira,
            gatewayFeeNaira: split.gatewayFeeNaira,
            taxNaira: split.taxNaira,
            referralNaira,
            platformNetNaira
          }
        });

        if (creatorProfileId && creatorNaira > 0) {
          const now = new Date();
          const reportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          await tx.producerEarning.create({
            data: {
              producerId: creatorProfileId,
              videoId,
              unlockId: unlock.id,
              grossAmount: amountNaira,
              producerShareAmount: creatorNaira,
              platformShareAmount: split.platformNaira,
              currency: 'NGN',
              reportMonth
            }
          });
        }

        if (referral) {
          await tx.referralEvent.create({
            data: {
              referralId: referral.id,
              unlockId: unlock.id,
              commissionNaira: referralNaira
            }
          });
          await tx.wallet.upsert({
            where: { userId: referral.promoterId },
            update: { balanceNaira: { increment: referralNaira } },
            create: { userId: referral.promoterId, balanceNaira: referralNaira }
          });
        }

        return { unlocked: true, source };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    revalidatePath('/');
    revalidatePath('/account');
    revalidatePath('/studio/wallet');
    revalidatePath('/admin/payments');

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({
        error: `You need ${creditsRequired} credits or NGN ${amountNaira} in value to unlock this title.`,
        reason: 'INSUFFICIENT_BALANCE',
        creditValueNaira: CREDIT_VALUE_NAIRA,
        creditsRequired,
        amountNaira
      }, { status: 402 });
    }

    return NextResponse.json({ error: 'Unable to unlock this title right now.' }, { status: 500 });
  }
}
