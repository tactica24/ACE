import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAcePath } from '@/lib/cache';
import { encryptFile, generateAceKey, wrapKey } from '@/lib/crypto';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { ensureCached } from '@/lib/stream';
import { isPlayableVideo } from '@/lib/video-access';

const DEFAULT_P2P_UNLOCK_FEE = 200;
const MAX_P2P_UNLOCK_FEE = 10000;

function normalizePhone(phone: string) {
  return phone.trim().replace(/(?!^\+)[^\d]/g, '');
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    key: `p2p-create:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 10,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many secure share attempts right now. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  const recipientPhone = typeof body.recipientPhone === 'string' ? normalizePhone(body.recipientPhone) : '';
  const unlockFee = Math.floor(Number(body.unlockFee ?? DEFAULT_P2P_UNLOCK_FEE));

  if (!videoId || !recipientPhone) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (recipientPhone === auth.phone) {
    return NextResponse.json({ error: 'Use a different phone number when sending a secure share.' }, { status: 400 });
  }
  if (!Number.isFinite(unlockFee) || unlockFee < DEFAULT_P2P_UNLOCK_FEE || unlockFee > MAX_P2P_UNLOCK_FEE) {
    return NextResponse.json({
      error: `Choose a secure share fee between NGN ${DEFAULT_P2P_UNLOCK_FEE} and NGN ${MAX_P2P_UNLOCK_FEE}.`
    }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (video.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Only approved titles can be shared securely.' }, { status: 403 });
  }
  if (!isPlayableVideo(video) || !video.r2Key) {
    return NextResponse.json({ error: 'Choose a playable episode or title to share.' }, { status: 400 });
  }

  const hasUnlock = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId } });
  if (video.creatorId !== auth.sub && !hasUnlock) {
    return NextResponse.json({ error: 'Unlock required to share' }, { status: 403 });
  }

  const filePath = await ensureCached(video.r2Key);
  const transfer = await prisma.p2PTransfer.create({
    data: {
      senderId: auth.sub,
      recipientPhone,
      videoId,
      aceFileKey: `ace-${videoId}-${Date.now()}.ace`,
      wrappedKey: '',
      unlockFee,
      status: 'CREATED'
    }
  });

  const aceKey = generateAceKey();
  const wrappedKey = wrapKey(aceKey, env.ACE_STREAM_SIGNING_SECRET);
  const acePath = getAcePath(transfer.aceFileKey);
  await encryptFile(filePath, acePath, aceKey);

  await prisma.p2PTransfer.update({ where: { id: transfer.id }, data: { wrappedKey } });

  return NextResponse.json({ ok: true, transferId: transfer.id });
}
