import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getFinanceConfig } from '@/lib/finance';
import { getRegionalPriceFromConfig } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
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
      posterKey: true,
      creatorId: true,
      status: true
    }
  });

  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (video.status !== 'APPROVED') return NextResponse.json({ error: 'Not available' }, { status: 403 });

  const auth = await getAuthFromRequest(req);
  let unlocked = false;
  if (auth) {
    const unlock = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId: video.id } });
    unlocked = Boolean(unlock);
  }

  const pricingConfig = await getFinanceConfig();
  const price = getRegionalPriceFromConfig(req, video.priceTier, pricingConfig);

  return NextResponse.json({
    video: {
      id: video.id,
      title: video.title,
      description: video.description,
      videoType: video.videoType,
      ageRating: video.ageRating,
      category: video.category,
      genres: video.genres,
      priceTier: video.priceTier,
      rightsTier: video.rightsTier,
      teaserSec: video.teaserSec,
      durationSec: video.durationSec,
      highlightSeconds: video.highlightSeconds,
      posterKey: video.posterKey,
      creatorId: video.creatorId
    },
    price,
    unlocked
  });
}
