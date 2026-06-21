import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { collectVerifiedYouTubeMatches } from '@/lib/youtube-match-import';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'YOUTUBE_DATA_API_KEY is not configured.' }, { status: 503 });

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });
  if (!admin) return NextResponse.json({ error: 'Create an admin account before collecting matches.' }, { status: 503 });

  try {
    const matches = await collectVerifiedYouTubeMatches(apiKey);
    let created = 0;
    let refreshed = 0;

    for (const match of matches) {
      const existing = await prisma.liveMatch.findUnique({ where: { youtubeVideoId: match.youtubeVideoId }, select: { id: true } });
      if (existing) {
        await prisma.liveMatch.update({
          where: { id: existing.id },
          data: {
            title: match.title,
            sport: match.sport,
            competition: match.competition,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            kickoffAt: match.kickoffAt,
            status: match.status,
            embedUrl: match.embedUrl,
            posterUrl: match.posterUrl,
            description: match.description,
            sourceLabel: match.sourceLabel,
            youtubeChannelId: match.youtubeChannelId
          }
        });
        refreshed += 1;
      } else {
        await prisma.liveMatch.create({
          data: { ...match, createdById: admin.id, isPublished: false, chatEnabled: true }
        });
        created += 1;
      }
    }

    return NextResponse.json({ ok: true, found: matches.length, created, refreshed, published: 0 });
  } catch (error) {
    console.error('Daily YouTube match collection failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Match collection failed.' }, { status: 502 });
  }
}
