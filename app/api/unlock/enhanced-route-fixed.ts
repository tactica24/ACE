import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { CREDIT_VALUE_NAIRA, getCreditUnitsForNaira, getCreditValueNairaFromStoredUnits, getCreditsForNaira } from '@/lib/credits';
import { calculateUnlockSplit, getFinanceConfig } from '@/lib/finance';
import { readReferralCode, resolveReferral } from '@/lib/referrals';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { isPlayableVideo, isSeriesContainer } from '@/lib/video-access';
import { getUnlockAmountNairaForVideo } from '@/lib/video-pricing';

// Enhanced transaction types for perfect auditing
interface TransactionMetadata {
  source: 'PASS' | 'WALLET' | 'REFERRAL_BONUS';
  creditsUsed: number;
  creditsRemaining: number;
  walletBalanceUsed: number;
  referralCode?: string;
  referralCommission?: number;
  taxWithheld: number;
  platformFee: number;
  creatorEarnings: number;
}

interface UnlockTransaction {
  userId: string;
  videoId: string;
  amountNaira: number;
  creditsRequired: number;
  metadata: TransactionMetadata;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

// Enhanced audit trail entry
interface AuditTrailEntry {
  userId: string;
  action: 'UNLOCK_ATTEMPT' | 'UNLOCK_SUCCESS' | 'UNLOCK_FAILED' | 'CREDIT_DEDUCTED' | 'CREATOR_PAID' | 'TAX_CALCULATED';
  videoId?: string;
  amount?: number;
  credits?: number;
  metadata: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export async function POST(req: NextRequest) {
  const startTime = new Date();
  const ipAddress = req.ip || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const sessionId = generateSessionId();

  // Authentication and verification
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    await logAuditEntry({
      userId: 'anonymous',
      action: 'UNLOCK_ATTEMPT',
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'unauthorized' }
    });
    return NextResponse.json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      requiresWebPayment: true 
    }, { status: 401 });
  }

  if (!hasVerifiedEmail(auth)) {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'email_not_verified' }
    });
    return NextResponse.json({ 
      error: EMAIL_VERIFICATION_REQUIRED_MESSAGE,
      code: 'EMAIL_VERIFICATION_REQUIRED',
      requiresWebPayment: true 
    }, { status: 403 });
  }

  // Rate limiting
  const rateLimit = await consumeRateLimit({
    key: `unlock:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 40,
    windowMs: 1000 * 60 * 10
  });

  if (!rateLimit.allowed) {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'rate_limited', retryAfter: rateLimit.retryAfter }
    });
    return NextResponse.json({ 
      error: 'Too many unlock attempts. Please wait and try again.',
      code: 'RATE_LIMITED',
      retryAfter: rateLimit.retryAfter,
      requiresWebPayment: true 
    }, { status: 429 });
  }

  // Request validation
  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  if (!videoId) {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'missing_video_id' }
    });
    return NextResponse.json({ 
      error: 'Video ID is required',
      code: 'MISSING_VIDEO_ID',
      requiresWebPayment: true 
    }, { status: 400 });
  }

  // Video validation
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { creator: { include: { creator: true } } }
  });

  if (!video) {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      videoId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'video_not_found' }
    });
    return NextResponse.json({ 
      error: 'Video not found',
      code: 'VIDEO_NOT_FOUND',
      requiresWebPayment: true 
    }, { status: 404 });
  }

  if (video.status !== 'APPROVED') {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      videoId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'video_not_approved', status: video.status }
    });
    return NextResponse.json({ 
      error: 'This title is not available for unlock yet.',
      code: 'VIDEO_NOT_APPROVED',
      requiresWebPayment: true 
    }, { status: 403 });
  }

  if (!isPlayableVideo(video) || isSeriesContainer(video)) {
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_ATTEMPT',
      videoId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: { reason: 'invalid_video_type', isPlayable: isPlayableVideo(video) }
    });
    return NextResponse.json({ 
      error: 'Select an individual episode to unlock and watch.',
      code: 'INVALID_VIDEO_TYPE',
      requiresWebPayment: true 
    }, { status: 400 });
  }

  // Financial calculations
  const financeConfig = await getFinanceConfig();
  const amountNaira = getUnlockAmountNairaForVideo(video, financeConfig);
  const creditsRequiredUnits = getCreditUnitsForNaira(amountNaira);
  const creditsRequired = getCreditsForNaira(amountNaira);
  
  // Referral processing
  const referralCode = readReferralCode(req, body?.referralCode);
  const referral = await resolveReferral(referralCode, videoId);
  
  // Enhanced split calculation with perfect tax tracking
  const split = calculateEnhancedUnlockSplit(amountNaira, financeConfig);
  const creatorProfileId = video.creator.creator?.id ?? null;
  const creatorNaira = creatorProfileId ? split.creatorNaira : 0;
  const referralNaira = referral ? Math.round(split.platformNaira * (referral.commissionPercent / 100)) : 0;
  const platformNetNaira = Math.max(split.platformNaira - referralNaira, 0);
  const taxWithheld = Math.round(amountNaira * (financeConfig.taxPercent / 100));
  const gatewayFeeNaira = Math.round(amountNaira * (financeConfig.gatewayFeePercent / 100));

  // Transaction processing with comprehensive audit trail
  const transaction: UnlockTransaction = {
    userId: auth.sub,
    videoId,
    amountNaira,
    creditsRequired,
    metadata: {
      source: 'WALLET', // Will be updated based on actual usage
      creditsUsed: 0,
      creditsRemaining: creditsRequired,
      walletBalanceUsed: 0,
      referralCode: referral?.code,
      referralCommission: referralNaira,
      taxWithheld,
      platformFee: gatewayFeeNaira,
      creatorEarnings: creatorNaira,
      ipAddress,
      userAgent,
      sessionId
    },
    timestamp: startTime,
    ipAddress,
    userAgent
  };

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Prevent duplicate unlocks with advisory lock
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`unlock:${auth.sub}:${videoId}`}))`;

        // Check for existing unlock
        const existing = await tx.unlock.findFirst({ where: { userId: auth.sub, videoId } });
        if (existing) {
          await logAuditEntry({
            userId: auth.sub,
            action: 'UNLOCK_ATTEMPT',
            videoId,
            ipAddress,
            userAgent,
            sessionId,
            timestamp: startTime,
            metadata: { reason: 'already_unlocked', existingUnlockId: existing.id }
          });
          return { unlocked: true, source: existing.source };
        }

        // Credit balance processing
        let source: 'PASS' | 'WALLET' | 'REFERRAL_BONUS' = 'WALLET';
        let remainingCreditUnits = creditsRequiredUnits;
        let passCreditUnitsUsed = 0;
        let walletCreditUnitsUsed = 0;
        let referralBonusCredits = 0;

        // Process active subscription passes
        const activePasses = await tx.subscriptionPass.findMany({
          where: { 
            userId: auth.sub, 
            expiresAt: { gt: new Date() }, 
            creditsRemaining: { gt: 0 } 
          },
          orderBy: { expiresAt: 'asc' }
        });

        for (const pass of activePasses) {
          if (remainingCreditUnits <= 0) {
            break;
          }

          const creditUnitsToUse = Math.min(pass.creditsRemaining, remainingCreditUnits);
          if (creditUnitsToUse <= 0) {
            continue;
          }

          await tx.subscriptionPass.update({
            where: { id: pass.id },
            data: { creditsRemaining: { decrement: creditUnitsToUse } }
          });
          
          passCreditUnitsUsed += creditUnitsToUse;
          remainingCreditUnits -= creditUnitsToUse;
          
          // Log pass credit usage
          await logAuditEntry({
            userId: auth.sub,
            action: 'CREDIT_DEDUCTED',
            videoId,
            ipAddress,
            userAgent,
            sessionId,
            timestamp: startTime,
            metadata: {
              source: 'PASS',
              passId: pass.id,
              creditsUsed: creditUnitsToUse,
              creditsRemaining: pass.creditsRemaining - creditUnitsToUse
            }
          });
        }

        // Process wallet credits
        const wallet = await tx.wallet.findUnique({ where: { userId: auth.sub } });
        const walletCreditUnitsAvailable = wallet?.credits ?? 0;
        const walletCreditUnitsNeeded = Math.min(walletCreditUnitsAvailable, remainingCreditUnits);
        
        if (walletCreditUnitsNeeded > 0) {
          if (!wallet) {
            throw new Error('INSUFFICIENT_BALANCE');
          }

          await tx.wallet.update({
            where: { userId: auth.sub },
            data: { credits: { decrement: walletCreditUnitsNeeded } }
          });
          
          walletCreditUnitsUsed = walletCreditUnitsNeeded;
          remainingCreditUnits -= walletCreditUnitsNeeded;
          
          // Log wallet credit usage
          await logAuditEntry({
            userId: auth.sub,
            action: 'CREDIT_DEDUCTED',
            videoId,
            ipAddress,
            userAgent,
            sessionId,
            timestamp: startTime,
            metadata: {
              source: 'WALLET',
              creditsUsed: walletCreditUnitsNeeded,
              creditsRemaining: walletCreditUnitsAvailable - walletCreditUnitsNeeded
            }
          });
        }

        // Check for referral bonus credits
        if (referral && remainingCreditUnits > 0) {
          // Award referral bonus credits (this could be a configurable feature)
          referralBonusCredits = Math.min(remainingCreditUnits, 5); // 5 credit bonus per successful referral
          remainingCreditUnits -= referralBonusCredits;
          
          // Log referral bonus
          await logAuditEntry({
            userId: auth.sub,
            action: 'CREDIT_DEDUCTED',
            videoId,
            ipAddress,
            userAgent,
            sessionId,
            timestamp: startTime,
            metadata: {
              source: 'REFERRAL_BONUS',
              referralId: referral.id,
              creditsUsed: referralBonusCredits
            }
          });
        }

        // Determine final source
        source = passCreditUnitsUsed === creditsRequiredUnits && walletCreditUnitsUsed === 0 && taxWithheld === 0
          ? 'PASS'
          : walletCreditUnitsUsed > 0 || taxWithheld > 0
          ? 'WALLET'
          : 'REFERRAL_BONUS';

        // Update transaction metadata
        transaction.metadata = {
          ...transaction.metadata,
          source,
          creditsUsed: passCreditUnitsUsed + walletCreditUnitsUsed + referralBonusCredits,
          creditsRemaining: remainingCreditUnits,
          walletBalanceUsed: getCreditValueNairaFromStoredUnits(walletCreditUnitsUsed)
        };

        // Create unlock record
        const unlock = await tx.unlock.create({
          data: {
            userId: auth.sub,
            videoId,
            amountNaira,
            amountMinor: amountNaira * 100,
            currency: 'NGN',
            source,
            watermarkText: auth.name?.trim() || auth.email.split('@')[0] || auth.email,
            referralCode: referral?.code,
            taxWithheld,
            gatewayFee: gatewayFeeNaira
          }
        });

        // Update platform wallet
        await tx.platformWallet.upsert({
          where: { id: 'ace-platform' },
          update: { balanceNaira: { increment: platformNetNaira } },
          create: { id: 'ace-platform', balanceNaira: platformNetNaira }
        });

        // Credit creator earnings
        if (creatorProfileId && creatorNaira > 0) {
          await tx.creatorProfile.update({
            where: { id: creatorProfileId },
            data: { earningsBalanceNaira: { increment: creatorNaira } }
          });
          
          // Log creator payment
          await logAuditEntry({
            userId: auth.sub,
            action: 'CREATOR_PAID',
            videoId,
            ipAddress,
            userAgent,
            sessionId,
            timestamp: startTime,
            metadata: {
              creatorId: creatorProfileId,
              amount: creatorNaira,
              unlockId: unlock.id
            }
          });
        }

        // Create unlock settlement with perfect audit trail
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
            platformNetNaira,
            taxWithheld,
            referralCommission: referralNaira
          }
        });

        // Process referral event
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

        // Log successful unlock
        await logAuditEntry({
          userId: auth.sub,
          action: 'UNLOCK_SUCCESS',
          videoId,
          ipAddress,
          userAgent,
          sessionId,
          timestamp: startTime,
          metadata: {
            unlockId: unlock.id,
            source,
            creditsUsed: transaction.metadata.creditsUsed,
            amount: amountNaira,
            creatorEarnings: creatorNaira,
            taxWithheld
          }
        });

        return { unlocked: true, source };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    // Log tax calculation for audit purposes
    await logAuditEntry({
      userId: auth.sub,
      action: 'TAX_CALCULATED',
      videoId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: {
        amount: amountNaira,
        taxRate: financeConfig.taxPercent,
        taxWithheld,
        creatorEarnings: creatorNaira,
        platformEarnings: platformNetNaira
      }
    });

    return NextResponse.json({ 
      success: true,
      unlocked: true,
      source: result.source,
      creditsUsed: transaction.metadata.creditsUsed,
      creditsRemaining: transaction.metadata.creditsRemaining,
      videoTitle: video.title,
      requiresWebPayment: false
    });

  } catch (error) {
    // Comprehensive error logging
    await logAuditEntry({
      userId: auth.sub,
      action: 'UNLOCK_FAILED',
      videoId,
      ipAddress,
      userAgent,
      sessionId,
      timestamp: startTime,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        transaction: transaction
      }
    });

    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({
        error: `You need ${creditsRequired} credits or NGN ${amountNaira} in value to unlock this title.`,
        code: 'INSUFFICIENT_BALANCE',
        creditValueNaira: CREDIT_VALUE_NAIRA,
        creditsRequired,
        amountNaira,
        requiresWebPayment: true,
        paymentUrl: `${process.env.NEXT_PUBLIC_WEB_URL}/wallet?required=${amountNaira}&video=${videoId}`
      }, { status: 402 });
    }

    console.error('Unlock transaction failed:', error);
    return NextResponse.json({ 
      error: 'Unable to unlock this title right now.',
      code: 'TRANSACTION_FAILED',
      requiresWebPayment: true,
      paymentUrl: `${process.env.NEXT_PUBLIC_WEB_URL}/wallet?required=${amountNaira}&video=${videoId}`
    }, { status: 500 });
  }
}

// Enhanced unlock split calculation with tax tracking
function calculateEnhancedUnlockSplit(amountNaira: number, config: {
  creatorSharePercent: number;
  platformSharePercent: number;
  gatewayFeePercent: number;
  taxPercent: number;
}) {
  const creatorNaira = Math.round(amountNaira * (config.creatorSharePercent / 100));
  const platformNaira = Math.round(amountNaira * (config.platformSharePercent / 100));
  const gatewayFeeNaira = Math.round(amountNaira * (config.gatewayFeePercent / 100));
  const taxNaira = Math.round(amountNaira * (config.taxPercent / 100));

  return {
    creatorNaira,
    platformNaira,
    gatewayFeeNaira,
    taxNaira
  };
}

// Audit trail logging function
async function logAuditEntry(entry: {
  userId: string;
  action: string;
  videoId?: string;
  amount?: number;
  credits?: number;
  metadata: any;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}) {
  try {
    await prisma.auditTrail.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        videoId: entry.videoId || null,
        amount: entry.amount || null,
        credits: entry.credits || null,
        metadata: entry.metadata || {},
        timestamp: entry.timestamp,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sessionId: entry.sessionId
      }
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
  }
}

// Generate unique session ID for tracking
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
