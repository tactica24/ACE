import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

const VALID_ROLES = new Set(['USER', 'CREATOR', 'ADMIN']);
const VALID_CREATOR_STATUSES = new Set(['NONE', 'REQUESTED', 'INVITED', 'SUBMITTED']);

function formatBlockers(blockers: Array<[string, number]>) {
  return blockers
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label} (${count})`);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = typeof body.action === 'string' ? body.action.trim() : '';
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!action || !userId) {
    return NextResponse.json({ error: 'Admin action and user are required.' }, { status: 400 });
  }

  if (userId === auth.sub && (action === 'DELETE_USER' || action === 'SET_ROLE')) {
    return NextResponse.json({ error: 'Use another admin account before changing or deleting your own access.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      creator: true
    }
  });

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (action === 'SET_ROLE') {
    const nextRole = typeof body.role === 'string' ? body.role.trim() : '';
    if (!VALID_ROLES.has(nextRole)) {
      return NextResponse.json({ error: 'Choose a valid role.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (nextRole === 'CREATOR' && !existingUser.creator) {
        await tx.creatorProfile.create({
          data: {
            userId,
            displayName: existingUser.name?.trim() || existingUser.email.split('@')[0]
          }
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          role: nextRole as 'USER' | 'CREATOR' | 'ADMIN',
          signupIntent: nextRole === 'CREATOR' ? 'CREATOR' : existingUser.signupIntent,
          creatorAccessStatus: nextRole === 'CREATOR'
            ? existingUser.creatorAccessStatus === 'NONE'
              ? 'SUBMITTED'
              : existingUser.creatorAccessStatus
            : existingUser.creatorAccessStatus
        }
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, signupIntent: true, creatorAccessStatus: true }
    });

    return NextResponse.json({ ok: true, user });
  }

  if (action === 'SET_CREATOR_STATUS') {
    const nextStatus = typeof body.creatorAccessStatus === 'string' ? body.creatorAccessStatus.trim() : '';
    if (!VALID_CREATOR_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Choose a valid producer access status.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (nextStatus !== 'NONE' && !existingUser.creator) {
        await tx.creatorProfile.create({
          data: {
            userId,
            displayName: existingUser.name?.trim() || existingUser.email.split('@')[0]
          }
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          signupIntent: nextStatus === 'NONE' ? 'VIEWER' : 'CREATOR',
          creatorAccessStatus: nextStatus as 'NONE' | 'REQUESTED' | 'INVITED' | 'SUBMITTED'
        }
      });
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, signupIntent: true, creatorAccessStatus: true }
    });

    return NextResponse.json({ ok: true, user });
  }

  if (action === 'DELETE_PRODUCER_PROFILE') {
    if (!existingUser.creator) {
      return NextResponse.json({ error: 'This account does not have a producer profile.' }, { status: 400 });
    }

    const [videos, contracts, settlements, payoutRequests] = await Promise.all([
      prisma.video.count({ where: { creatorId: userId } }),
      prisma.contract.count({ where: { creatorId: existingUser.creator.id } }),
      prisma.unlockSettlement.count({ where: { creatorProfileId: existingUser.creator.id } }),
      prisma.creatorPayoutRequest.count({ where: { creatorProfileId: existingUser.creator.id } })
    ]);

    const blockers = formatBlockers([
      ['uploaded titles', videos],
      ['signed contracts', contracts],
      ['settlement records', settlements],
      ['payout requests', payoutRequests]
    ]);

    if (blockers.length) {
      return NextResponse.json({
        error: `Producer profile cannot be deleted while it still has: ${blockers.join(', ')}.`
      }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.creatorProfile.delete({ where: { id: existingUser.creator.id } }),
      prisma.user.update({
        where: { id: userId },
        data: {
          role: existingUser.role === 'ADMIN' ? 'ADMIN' : 'USER',
          signupIntent: 'VIEWER',
          creatorAccessStatus: 'NONE'
        }
      })
    ]);

    return NextResponse.json({ ok: true });
  }

  if (action === 'DELETE_USER') {
    const [wallet, videos, unlocks, subscriptions, legacyTransferRecords, payments, referralLinks, familyLinks, tvPairings, supportTickets, watchHistory, streamSessions, offlinePackages, moderatorActions, supportActionsReceived, supportActionsPerformed, creatorContracts, creatorSettlements, creatorPayouts] = await Promise.all([
      prisma.wallet.count({ where: { userId } }),
      prisma.video.count({ where: { creatorId: userId } }),
      prisma.unlock.count({ where: { userId } }),
      prisma.subscriptionPass.count({ where: { userId } }),
      prisma.p2PTransfer.count({ where: { senderId: userId } }),
      prisma.payment.count({ where: { userId } }),
      prisma.referralLink.count({ where: { promoterId: userId } }),
      prisma.familyLink.count({ where: { ownerId: userId } }),
      prisma.tvPairingSession.count({ where: { claimedById: userId } }),
      prisma.supportTicket.count({ where: { userId } }),
      prisma.watchHistory.count({ where: { userId } }),
      prisma.streamSession.count({ where: { userId } }),
      prisma.offlinePackage.count({ where: { ownerId: userId } }),
      prisma.moderationItem.count({ where: { reviewerId: userId } }),
      prisma.adminSupportAction.count({ where: { userId } }),
      prisma.adminSupportAction.count({ where: { adminUserId: userId } }),
      existingUser.creator ? prisma.contract.count({ where: { creatorId: existingUser.creator.id } }) : Promise.resolve(0),
      existingUser.creator ? prisma.unlockSettlement.count({ where: { creatorProfileId: existingUser.creator.id } }) : Promise.resolve(0),
      existingUser.creator ? prisma.creatorPayoutRequest.count({ where: { creatorProfileId: existingUser.creator.id } }) : Promise.resolve(0)
    ]);

    const blockers = formatBlockers([
      ['wallet records', wallet],
      ['uploaded titles', videos],
      ['unlock records', unlocks],
      ['subscriptions', subscriptions],
      ['archived transfer records', legacyTransferRecords],
      ['payments', payments],
      ['referral links', referralLinks],
      ['family links', familyLinks],
      ['TV pairings', tvPairings],
      ['support tickets', supportTickets],
      ['watch history', watchHistory],
      ['stream sessions', streamSessions],
      ['offline packages', offlinePackages],
      ['moderation reviews', moderatorActions],
      ['support actions received', supportActionsReceived],
      ['support actions performed', supportActionsPerformed],
      ['producer contracts', creatorContracts],
      ['producer settlements', creatorSettlements],
      ['producer payout requests', creatorPayouts]
    ]);

    if (blockers.length) {
      return NextResponse.json({
        error: `User cannot be deleted safely while the account still has: ${blockers.join(', ')}.`
      }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (existingUser.creator) {
        await tx.creatorProfile.delete({ where: { id: existingUser.creator.id } });
      }

      await tx.wallet.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 });
}
