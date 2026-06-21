import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { LIVE_CHAT_EMOJIS } from '@/lib/live-matches';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Sign in to react.' }, { status: 401 });
  const body = await req.json();
  const messageId = typeof body.messageId === 'string' ? body.messageId : '';
  const emoji = typeof body.emoji === 'string' ? body.emoji : '';
  if (!LIVE_CHAT_EMOJIS.includes(emoji as never)) return NextResponse.json({ error: 'Unsupported reaction.' }, { status: 400 });

  const limit = await consumeRateLimit({
    key: `live-reaction:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 30,
    windowMs: 60_000
  });
  if (!limit.allowed) return NextResponse.json({ error: 'Slow down on reactions for a moment.' }, { status: 429 });

  const message = await prisma.liveChatMessage.findFirst({
    where: { id: messageId, matchId: params.id, isDeleted: false, match: { isPublished: true, chatEnabled: true } },
    select: { id: true }
  });
  if (!message) return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  const key = { messageId_userId_emoji: { messageId, userId: auth.sub, emoji } };
  const existing = await prisma.liveChatReaction.findUnique({ where: key, select: { id: true } });
  if (existing) await prisma.liveChatReaction.delete({ where: key });
  else await prisma.liveChatReaction.create({ data: { messageId, userId: auth.sub, emoji } });
  return NextResponse.json({ ok: true, active: !existing });
}
