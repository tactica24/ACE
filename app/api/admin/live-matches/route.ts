import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { extractEmbedUrl, isLiveMatchStatus, slugifyMatch } from '@/lib/live-matches';

async function requireAdmin(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  return auth?.role === 'ADMIN' ? auth : null;
}

function optionalText(value: unknown, max = 500) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, max) || null;
}

function parseMatch(body: Record<string, unknown>) {
  const title = optionalText(body.title, 140);
  const competition = optionalText(body.competition, 100);
  const sport = optionalText(body.sport, 50) ?? 'Football';
  const homeTeam = optionalText(body.homeTeam, 80);
  const awayTeam = optionalText(body.awayTeam, 80);
  const embedUrl = extractEmbedUrl(typeof body.embedCode === 'string' ? body.embedCode : '');
  const kickoffAt = new Date(typeof body.kickoffAt === 'string' ? body.kickoffAt : '');
  const status = isLiveMatchStatus(body.status) ? body.status : 'UPCOMING';

  if (!title || !competition || !homeTeam || !awayTeam) {
    return { error: 'Title, competition, and both teams are required.' } as const;
  }
  if (!embedUrl) {
    return { error: 'Add a valid HTTPS player URL or iframe embed code.' } as const;
  }
  if (Number.isNaN(kickoffAt.getTime())) {
    return { error: 'Add a valid kickoff date and time.' } as const;
  }

  const posterUrl = optionalText(body.posterUrl, 1000);
  if (posterUrl && !extractEmbedUrl(posterUrl)) {
    return { error: 'Poster URL must be a valid HTTPS URL.' } as const;
  }

  return {
    data: {
      title,
      sport,
      competition,
      homeTeam,
      awayTeam,
      embedUrl,
      kickoffAt,
      status,
      posterUrl,
      description: optionalText(body.description, 1200),
      venue: optionalText(body.venue, 120),
      sourceLabel: optionalText(body.sourceLabel, 80),
      isPublished: body.isPublished === true,
      chatEnabled: body.chatEnabled !== false
    }
  } as const;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = parseMatch(await req.json());
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const baseSlug = slugifyMatch(`${parsed.data.homeTeam}-${parsed.data.awayTeam}-${parsed.data.kickoffAt.toISOString().slice(0, 10)}`) || `match-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.liveMatch.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const match = await prisma.liveMatch.create({
    data: { ...parsed.data, slug, createdById: auth.sub }
  });
  return NextResponse.json({ ok: true, match }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const id = optionalText(body.id, 100);
  if (!id) return NextResponse.json({ error: 'Match ID is required.' }, { status: 400 });
  const parsed = parseMatch(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const match = await prisma.liveMatch.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, match });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Match not found.' }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'Match ID is required.' }, { status: 400 });
  await prisma.liveMatch.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
