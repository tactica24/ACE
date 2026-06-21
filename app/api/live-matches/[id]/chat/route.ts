import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

function serializeMessage(message: any, currentUserId?: string) {
  const grouped = new Map<string, { emoji: string; count: number }>();
  for (const reaction of message.reactions) {
    const current = grouped.get(reaction.emoji);
    grouped.set(reaction.emoji, { emoji: reaction.emoji, count: (current?.count ?? 0) + 1 });
  }
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    author: message.user.liveChatProfile,
    replyTo: message.parent ? {
      id: message.parent.id,
      content: message.parent.content,
      author: message.parent.user.liveChatProfile
    } : null,
    reactions: [...grouped.values()].map((reaction) => ({
      ...reaction,
      reacted: currentUserId ? message.reactions.some((item: any) => item.emoji === reaction.emoji && item.userId === currentUserId) : false
    }))
  };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  const match = await prisma.liveMatch.findFirst({
    where: { id: params.id, isPublished: true },
    select: { id: true }
  });
  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

  const before = new URL(req.url).searchParams.get('before');
  const beforeDate = before ? new Date(before) : null;
  if (beforeDate && Number.isNaN(beforeDate.getTime())) {
    return NextResponse.json({ error: 'Invalid message cursor.' }, { status: 400 });
  }
  const messages = await prisma.liveChatMessage.findMany({
    where: {
      matchId: params.id,
      isDeleted: false,
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { liveChatProfile: { select: { handle: true, avatarEmoji: true } } } },
      parent: {
        select: {
          id: true,
          content: true,
          user: { select: { liveChatProfile: { select: { handle: true, avatarEmoji: true } } } }
        }
      },
      reactions: { select: { emoji: true, userId: true } }
    }
  });
  return NextResponse.json({ messages: messages.reverse().map((message) => serializeMessage(message, auth?.sub)) });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Sign in to join the conversation.' }, { status: 401 });

  const limit = await consumeRateLimit({
    key: `live-chat:${params.id}:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 12,
    windowMs: 60_000
  });
  if (!limit.allowed) return NextResponse.json({ error: 'The chat is moving fast. Wait a moment and try again.' }, { status: 429 });

  const [match, profile] = await Promise.all([
    prisma.liveMatch.findFirst({ where: { id: params.id, isPublished: true }, select: { chatEnabled: true } }),
    prisma.liveChatProfile.findUnique({ where: { userId: auth.sub }, select: { id: true } })
  ]);
  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
  if (!match.chatEnabled) return NextResponse.json({ error: 'Chat is closed for this match.' }, { status: 403 });
  if (!profile) return NextResponse.json({ error: 'Choose your chat name first.' }, { status: 409 });

  const body = await req.json();
  const content = typeof body.content === 'string' ? body.content.trim().slice(0, 280) : '';
  const parentId = typeof body.parentId === 'string' && body.parentId ? body.parentId : null;
  if (!content) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });

  if (parentId) {
    const parent = await prisma.liveChatMessage.findFirst({
      where: { id: parentId, matchId: params.id, isDeleted: false },
      select: { id: true }
    });
    if (!parent) return NextResponse.json({ error: 'The message you are replying to is no longer available.' }, { status: 400 });
  }

  await prisma.liveChatMessage.create({ data: { matchId: params.id, userId: auth.sub, parentId, content } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
