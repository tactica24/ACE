import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { onlyCatalogVideosWithPosters } from '@/lib/catalog-posters';
import { getFinanceConfig } from '@/lib/finance';
import { getMoviePosterUrlFromCandidates } from '@/lib/movie-assets';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const pricingConfig = await getFinanceConfig();
  const requestedLimit = Number(req.nextUrl.searchParams.get('limit') ?? 24);
  const take = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(Math.floor(requestedLimit), 60))
    : 24;
  const videos = await prisma.video.findMany({
    where: getViewerReadyCatalogWhere(),
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
      unlockPrice: true,
      rightsTier: true,
      teaserSec: true,
      durationSec: true,
      releaseYear: true,
      highlightSeconds: true,
      posterKey: true,
      series: {
        select: {
          posterKey: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: take + 20
  });
  const posterBackedVideos = onlyCatalogVideosWithPosters(videos).slice(0, take);

  return NextResponse.json(
    {
      videos: posterBackedVideos.map((video) => ({
        ...video,
        posterKey: video.posterKey ?? video.series?.posterKey ?? null,
        posterUrl: getMoviePosterUrlFromCandidates(video, video, video.series),
        price: getRegionalPriceForVideo(req, video, pricingConfig)
      }))
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        Vary: 'x-ace-country, x-vercel-ip-country, cf-ipcountry, cloudfront-viewer-country, x-country, x-geo-country, accept-language'
      }
    }
  );
}
