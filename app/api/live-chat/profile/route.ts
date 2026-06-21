import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isValidChatHandle, LIVE_CHAT_AVATARS, normalizeChatHandle } from '@/lib/live-matches';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Sign in to create a chat identity.' }, { status: 401 });

  const body = await req.json();
  const handle = normalizeChatHandle(typeof body.handle === 'string' ? body.handle : '');
  const avatarEmoji = typeof body.avatarEmoji === 'string' && LIVE_CHAT_AVATARS.includes(body.avatarEmoji as never)
    ? body.avatarEmoji
    : '⚽';

  if (!isValidChatHandle(handle)) {
    return NextResponse.json({ error: 'Use 3–20 letters, numbers, or underscores.' }, { status: 400 });
  }

  try {
    const profile = await prisma.liveChatProfile.upsert({
      where: { userId: auth.sub },
      update: { handle, avatarEmoji },
      create: { userId: auth.sub, handle, avatarEmoji },
      select: { handle: true, avatarEmoji: true }
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'That chat name is already taken. Try another.' }, { status: 409 });
    }
    throw error;
  }
}
