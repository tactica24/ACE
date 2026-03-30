import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { CREDIT_VALUE_NAIRA, getCreditValueNaira, getCreditsForNaira } from '@/lib/credits';
import { calculateUnlockSplit, getFinanceConfig } from '@/lib/finance';
import { getBasePriceNairaForTierFromConfig } from '@/lib/pricing';
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

  const financeConfig = await getFinanceConfig();
  const amountNaira = getBasePriceNairaForTierFromConfig(financeConfig, video.priceTier);
  const creditsRequired = getCreditsForNaira(amountNaira);
  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);
  const split = calculateUnlockSplit(amountNaira, financeConfig);
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
        let remainingCredits = creditsRequired;
        let passCreditsUsed = 0;

        for (const pass of activePasses) {
          if (remainingCredits <= 0) {
            break;
          }

          const creditsToUse = Math.min(pass.creditsRemaining, remainingCredits);
          if (creditsToUse <= 0) {
            continue;
          }

          await tx.subscriptionPass.update({
            where: { id: pass.id },
            data: { creditsRemaining: { decrement: creditsToUse } }
          });
          passCreditsUsed += creditsToUse;
          remainingCredits -= creditsToUse;
        }

        const wallet = await tx.wallet.findUnique({ where: { userId: auth.sub } });
        const walletCreditsUsed = Math.min(wallet?.credits ?? 0, remainingCredits);
        remainingCredits -= walletCreditsUsed;
        const walletBalanceNeeded = getCreditValueNaira(remainingCredits);

        if (walletBalanceNeeded > 0 && (wallet?.balanceNaira ?? 0) < walletBalanceNeeded) {
          throw new Error('INSUFFICIENT_BALANCE');
        }

        if (walletCreditsUsed > 0 || walletBalanceNeeded > 0) {
          if (!wallet) {
            throw new Error('INSUFFICIENT_BALANCE');
          }

          await tx.wallet.update({
            where: { userId: auth.sub },
            data: {
              credits: walletCreditsUsed > 0 ? { decrement: walletCreditsUsed } : undefined,
              balanceNaira: walletBalanceNeeded > 0 ? { decrement: walletBalanceNeeded } : undefined
            }
          });
        }

        source = passCreditsUsed === creditsRequired && walletCreditsUsed === 0 && walletBalanceNeeded === 0 ? 'PASS' : 'WALLET';

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
