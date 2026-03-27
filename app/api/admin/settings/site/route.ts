import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

function parseLaunchCountdown(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const directDate = new Date(normalized);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  );
}

export async function POST(req: NextRequest) {
  const auth = (await getAuthFromRequest(req)) ?? (await getCurrentUser());
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const homePageMode = body.homePageMode === 'LAUNCH' ? 'LAUNCH' : 'LIVE';
  const launchTitle = typeof body.launchTitle === 'string' ? body.launchTitle.trim() : '';
  const launchMessage = typeof body.launchMessage === 'string' ? body.launchMessage.trim() : '';
  const launchCountdownAt = typeof body.launchCountdownAt === 'string' ? body.launchCountdownAt.trim() : '';
  const launchCtaLabel = typeof body.launchCtaLabel === 'string' ? body.launchCtaLabel.trim() : '';
  const launchCtaHref = typeof body.launchCtaHref === 'string' ? body.launchCtaHref.trim() : '';
  const parsedLaunchCountdown = launchCountdownAt ? parseLaunchCountdown(launchCountdownAt) : null;

  if (launchCountdownAt && (!parsedLaunchCountdown || Number.isNaN(parsedLaunchCountdown.getTime()))) {
    return NextResponse.json({ error: 'Use a valid countdown date and time.' }, { status: 400 });
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      homePageMode,
      launchTitle: launchTitle || 'ACE is launching soon',
      launchMessage: launchMessage || 'We are getting the catalog, producers, and launch details ready.',
      launchCountdownAt: parsedLaunchCountdown,
      launchCtaLabel: launchCtaLabel || null,
      launchCtaHref: launchCtaHref || null
    },
    create: {
      id: 'default',
      homePageMode,
      launchTitle: launchTitle || 'ACE is launching soon',
      launchMessage: launchMessage || 'We are getting the catalog, producers, and launch details ready.',
      launchCountdownAt: parsedLaunchCountdown,
      launchCtaLabel: launchCtaLabel || null,
      launchCtaHref: launchCtaHref || null
    }
  });

  return NextResponse.json({ ok: true, settings });
}
