import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const [match, auth] = await Promise.all([
    prisma.liveMatch.findFirst({
      where: { id: params.id, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        sport: true,
        competition: true,
        homeTeam: true,
        awayTeam: true,
        kickoffAt: true,
        status: true,
        embedUrl: true,
        posterUrl: true,
        description: true,
        venue: true,
        sourceLabel: true,
        chatEnabled: true
      }
    }),
    getAuthFromRequest(req)
  ]);

  if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 });

  const profile = auth
    ? await prisma.liveChatProfile.findUnique({
        where: { userId: auth.sub },
        select: { handle: true, avatarEmoji: true }
      })
    : null;

  return NextResponse.json({ match, isSignedIn: Boolean(auth), profile });
}
