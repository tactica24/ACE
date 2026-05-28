import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { CREDIT_VALUE_NAIRA, getCreditUnitsForNaira, getCreditsForNaira } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { calculateUnlockSplit, getFinanceConfig } from '@/lib/finance';
import { getMovieMp4StorageStatus } from '@/lib/movie-storage';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { planUnlockDebit } from '@/lib/unlock-debit';
import { isSeriesContainer } from '@/lib/video-access';
import { getVideoAvailabilityDecision } from '@/lib/video-availability';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';

function isPrismaKnownError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE, reason: 'EMAIL_VERIFICATION_REQUIRED' }, { status: 403 });
  }

  const rateLimit = await consumeRateLimit({
    key: `movie-unlock:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 40,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many unlock attempts. Please wait a moment and try again.', reason: 'RATE_LIMITED' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const videoId = params.id.trim();
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
  const mp4Status = await getMovieMp4StorageStatus(video);
  if (!mp4Status.selectedKey) {
    return NextResponse.json({
      error: mp4Status.candidates.length
        ? 'The MP4 file for this title is missing from storage. Please try again after it is re-uploaded.'
        : 'No playable MP4 is attached to this title yet.'
    }, { status: 409 });
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

  async function createUnlockTransaction() {
    return prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`unlock:${auth.sub}:${videoId}`}))`;

        const existing = await tx.unlock.findFirst({ where: { userId: auth.sub, videoId } });
        if (existing) {
          return { unlocked: true, source: existing.source, unlockId: existing.id, created: false };
        }

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

        if (!debitPlan.sufficientBalance) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        for (let index = 0; index < activePasses.length; index += 1) {
          const usage = debitPlan.passUsageUnits[index] ?? 0;
          if (usage > 0) {
            await tx.subscriptionPass.update({
              where: { id: activePasses[index].id },
              data: { creditsRemaining: { decrement: usage } }
            });
          }
        }

        if (debitPlan.walletCreditUnitsUsed > 0 || debitPlan.walletBalanceNeeded > 0) {
          if (!wallet) throw new Error('INSUFFICIENT_BALANCE');
          await tx.wallet.update({
            where: { userId: auth.sub },
            data: {
              credits: debitPlan.walletCreditUnitsUsed > 0 ? { decrement: debitPlan.walletCreditUnitsUsed } : undefined,
              balanceNaira: debitPlan.walletBalanceNeeded > 0 ? { decrement: debitPlan.walletBalanceNeeded } : undefined
            }
          });
        }

        const unlock = await tx.unlock.create({
          data: {
            userId: auth.sub,
            videoId,
            amountNaira,
            amountMinor: amountNaira * 100,
            currency: 'NGN',
            source: debitPlan.source,
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

        if (referral) {
          await tx.wallet.upsert({
            where: { userId: referral.promoterId },
            update: { balanceNaira: { increment: referralNaira } },
            create: { userId: referral.promoterId, balanceNaira: referralNaira }
          });
        }

        return { unlocked: true, source: debitPlan.source, unlockId: unlock.id, created: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  async function recordUnlockSideEffects(unlockId: string, created: boolean) {
    if (!created) return;

    const results = await Promise.allSettled([
      prisma.video.update({
        where: { id: videoId },
        data: { totalUnlocks: { increment: 1 } }
      }),
      prisma.unlockSettlement.create({
        data: {
          unlockId,
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
      }),
      creatorProfileId && creatorNaira > 0
        ? prisma.producerEarning.create({
            data: {
              producerId: creatorProfileId,
              videoId,
              unlockId,
              grossAmount: amountNaira,
              producerShareAmount: creatorNaira,
              platformShareAmount: split.platformNaira,
              currency: 'NGN',
              reportMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
            }
          })
        : Promise.resolve(null),
      referral
        ? prisma.referralEvent.create({
            data: {
              referralId: referral.id,
              unlockId,
              commissionNaira: referralNaira
            }
          })
        : Promise.resolve(null)
    ]);

    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) {
      console.error('[movie-unlock] side effects failed', failed);
    }
  }

  try {
    let result;
    try {
      result = await createUnlockTransaction();
    } catch (error) {
      if (isPrismaKnownError(error, 'P2034')) {
        result = await createUnlockTransaction();
      } else {
        throw error;
      }
    }

    await recordUnlockSideEffects(result.unlockId, result.created);
    revalidatePath('/');
    revalidatePath('/account');
    revalidatePath('/my-movies');
    revalidatePath('/studio/wallet');
    revalidatePath('/admin/payments');

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[movie-unlock] transaction failed', { videoId, error });

    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({
        error: `You need ${creditsRequired} credits or NGN ${amountNaira} in value to unlock this title.`,
        reason: 'INSUFFICIENT_BALANCE',
        creditValueNaira: CREDIT_VALUE_NAIRA,
        creditsRequired,
        amountNaira
      }, { status: 402 });
    }

    if (isPrismaKnownError(error, 'P2002')) {
      const existing = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId } });
      if (existing) {
        return NextResponse.json({ ok: true, unlocked: true, source: existing.source });
      }
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'Unable to unlock this title right now. Please try again in a moment.',
        reason: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unable to unlock this title right now. Please try again in a moment.' }, { status: 500 });
  }
}
