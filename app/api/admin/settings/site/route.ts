import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
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

  const settings = await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      homePageMode,
      launchTitle: launchTitle || 'ACE is launching soon',
      launchMessage: launchMessage || 'We are getting the catalog, producers, and launch details ready.',
      launchCountdownAt: launchCountdownAt ? new Date(launchCountdownAt) : null,
      launchCtaLabel: launchCtaLabel || null,
      launchCtaHref: launchCtaHref || null
    },
    create: {
      id: 'default',
      homePageMode,
      launchTitle: launchTitle || 'ACE is launching soon',
      launchMessage: launchMessage || 'We are getting the catalog, producers, and launch details ready.',
      launchCountdownAt: launchCountdownAt ? new Date(launchCountdownAt) : null,
      launchCtaLabel: launchCtaLabel || null,
      launchCtaHref: launchCtaHref || null
    }
  });

  return NextResponse.json({ ok: true, settings });
}
