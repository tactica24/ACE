import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { getRegionalPriceFromConfig } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pricingConfig = await getFinanceConfig();
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
    videos: videos.map((video) => ({ ...video, price: getRegionalPriceFromConfig(req, video.priceTier, pricingConfig) }))
  });
}
