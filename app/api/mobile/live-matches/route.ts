import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const matches = await prisma.liveMatch.findMany({
    where: { isPublished: true },
    orderBy: { kickoffAt: 'asc' },
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
      posterUrl: true,
      chatEnabled: true,
      _count: { select: { messages: true } }
    }
  });
  const statusOrder = { LIVE: 0, UPCOMING: 1, ENDED: 2, POSTPONED: 3 } as const;
  matches.sort((left, right) => statusOrder[left.status] - statusOrder[right.status]);

  return NextResponse.json({
    matches: matches.map(({ _count, ...match }) => ({
      ...match,
      messageCount: _count.messages
    }))
  });
}
