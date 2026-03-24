import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { ensureCached } from '@/lib/stream';
import { encryptFile, generateAceKey, wrapKey } from '@/lib/crypto';
import { getAcePath } from '@/lib/cache';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const videoId = body.videoId as string | undefined;
  const recipientPhone = body.recipientPhone as string | undefined;
  const unlockFee = Number(body.unlockFee || 200);

  if (!videoId || !recipientPhone) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });

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




