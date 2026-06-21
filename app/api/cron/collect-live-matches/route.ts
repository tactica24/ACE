import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { collectVerifiedYouTubeMatches, VERIFIED_MATCH_CHANNELS } from '@/lib/youtube-match-import';
import { saveYouTubeMatchDrafts } from '@/lib/youtube-match-sync';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'YOUTUBE_DATA_API_KEY is not configured.' }, { status: 503 });

  const [admin, savedSources] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.youTubeMatchSource.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  ]);
  if (!admin) return NextResponse.json({ error: 'Create an admin account before collecting matches.' }, { status: 503 });

  try {
    const channels = [
      ...VERIFIED_MATCH_CHANNELS,
      ...savedSources.map((source) => ({ id: source.channelId, label: source.title, sport: source.sport, url: source.channelUrl }))
    ];
    const matches = await collectVerifiedYouTubeMatches(apiKey, channels);
    const result = await saveYouTubeMatchDrafts(matches, admin.id);
    if (savedSources.length) {
      await prisma.youTubeMatchSource.updateMany({
        where: { id: { in: savedSources.map((source) => source.id) } },
        data: { lastCheckedAt: new Date() }
      });
    }
    return NextResponse.json({ ok: true, sources: channels.length, ...result });
  } catch (error) {
    console.error('YouTube match collection failed:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Match collection failed.' }, { status: 502 });
  }
}
