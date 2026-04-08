import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pricingConfig = await getFinanceConfig();
  const videos = await prisma.video.findMany({
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
      priceTier: true,
      rightsTier: true,
      teaserSec: true,
      durationSec: true,
      releaseYear: true,
      highlightSeconds: true,
      posterKey: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({
    videos: videos.map((video) => ({ ...video, price: getRegionalPriceForVideo(req, video, pricingConfig) }))
  });
}
