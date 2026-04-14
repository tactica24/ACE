import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestedLimit = Number(req.nextUrl.searchParams.get('limit') ?? 24);
  const take = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 60))
    : 24;

  const titles = await prisma.video.findMany({
    where: { status: 'APPROVED', seriesId: null },
    select: {
      id: true,
      seriesId: true,
      title: true,
      description: true,
      videoType: true,
      ageRating: true,
      category: true,
      genres: true,
      teaserSec: true,
      durationSec: true,
      releaseYear: true,
      highlightSeconds: true,
      posterKey: true
    },
    orderBy: { createdAt: 'desc' },
    take
  });

  return NextResponse.json(
    { titles },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120'
      }
    }
  );
}
