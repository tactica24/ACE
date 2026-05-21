import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getFinanceConfig } from '@/lib/finance';
import { getRegionalPriceForVideo } from '@/lib/video-pricing';
import { getViewerReadyEpisodeWhere, getViewerReadyVideoWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findFirst({
    where: getViewerReadyVideoWhere(params.id),
    include: {
      episodes: {
        where: getViewerReadyEpisodeWhere(),
        orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }]
      }
    }
  });

  if (!video) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const auth = await getAuthFromRequest(req);
  let unlocked = false;
  if (auth) {
    const unlock = await prisma.unlock.findFirst({ where: { userId: auth.sub, videoId: video.id } });
    unlocked = Boolean(unlock);
  }

  const pricingConfig = await getFinanceConfig();
  const price = getRegionalPriceForVideo(req, video, pricingConfig);

  return NextResponse.json(
    {
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
        releaseYear: video.releaseYear,
        highlightSeconds: video.highlightSeconds,
        posterKey: video.posterKey,
        creatorId: video.creatorId,
        seriesId: video.seriesId,
        seasonNumber: video.seasonNumber,
        episodeNumber: video.episodeNumber,
        episodes: video.episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          teaserSec: episode.teaserSec,
          durationSec: episode.durationSec,
          posterKey: episode.posterKey,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber
        }))
      },
      price,
      unlocked
    },
    {
      headers: {
        Vary: 'authorization, cookie, x-ace-country, x-vercel-ip-country, cf-ipcountry, cloudfront-viewer-country, x-country, x-geo-country, accept-language',
        'Cache-Control': auth
          ? 'private, max-age=15, stale-while-revalidate=60'
          : 'public, s-maxage=30, stale-while-revalidate=120'
      }
    }
  );
}
