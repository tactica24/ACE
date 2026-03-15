import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getRegionalPrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const videos = await prisma.video.findMany({
    where: { status: 'APPROVED' },
    select: {
      id: true,
      title: true,
      description: true,
      videoType: true,
      ageRating: true,
      category: true,
      genres: true,
      priceTier: true,
      rightsTier: true,
      teaserSec: true,
      durationSec: true,
      highlightSeconds: true,
      posterKey: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    videos: videos.map((video) => ({ ...video, price: getRegionalPrice(req, video.priceTier) }))
  });
}
