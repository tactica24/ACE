import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { classifyYouTubeInput, collectVerifiedYouTubeMatches, inspectYouTubeMatchVideo, resolveYouTubeChannel, VERIFIED_MATCH_CHANNELS } from '@/lib/youtube-match-import';
import { saveYouTubeMatchDrafts } from '@/lib/youtube-match-sync';

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  return auth?.role === 'ADMIN' ? auth : null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const apiKey = process.env.YOUTUBE_DATA_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: 'YOUTUBE_DATA_API_KEY is not configured.' }, { status: 503 });

  const body = await request.json() as { url?: unknown; sport?: unknown };
  const input = typeof body.url === 'string' ? body.url.trim() : '';
  const sport = typeof body.sport === 'string' ? body.sport : 'Sports';
  const kind = classifyYouTubeInput(input);
  if (!kind) return NextResponse.json({ error: 'Paste a valid YouTube video link, channel link, @handle, or channel ID.' }, { status: 400 });

  try {
    if (kind === 'video') {
      const match = await inspectYouTubeMatchVideo(input, apiKey);
      const result = await saveYouTubeMatchDrafts([match], auth.sub);
      return NextResponse.json({ ok: true, kind, message: `${match.title} was added to Draft matches.`, result });
    }

    const channel = await resolveYouTubeChannel(input, sport, apiKey);
    const builtIn = VERIFIED_MATCH_CHANNELS.find((source) => source.id === channel.id);
    if (builtIn) {
      const matches = await collectVerifiedYouTubeMatches(apiKey, [builtIn]);
      const result = await saveYouTubeMatchDrafts(matches, auth.sub);
      return NextResponse.json({ ok: true, kind, message: `${builtIn.label} is already an automatic source. ${result.created} new match${result.created === 1 ? '' : 'es'} added to Drafts.`, result });
    }
    const source = await prisma.youTubeMatchSource.upsert({
      where: { channelId: channel.id },
      update: { title: channel.label, channelUrl: channel.url, sport: channel.sport, isActive: true },
      create: { channelId: channel.id, title: channel.label, channelUrl: channel.url, sport: channel.sport, createdById: auth.sub }
    });
    const matches = await collectVerifiedYouTubeMatches(apiKey, [channel]);
    const result = await saveYouTubeMatchDrafts(matches, auth.sub);
    await prisma.youTubeMatchSource.update({ where: { id: source.id }, data: { lastCheckedAt: new Date() } });
    return NextResponse.json({
      ok: true,
      kind,
      source: { ...source, lastCheckedAt: new Date().toISOString() },
      message: `${channel.label} is now an automatic source. ${result.created} match${result.created === 1 ? '' : 'es'} added to Drafts.`,
      result
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to inspect this YouTube link.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Source ID is required.' }, { status: 400 });
  await prisma.youTubeMatchSource.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
