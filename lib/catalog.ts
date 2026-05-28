import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { type PriceTierValue } from '@/lib/media-types';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export type CatalogVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  unlockPrice: number | null;
  posterKey: string | null;
  genres: string[];
  durationSec: number;
  releaseYear: number | null;
  videoType: string;
  ageRating: string;
  category: string;
  createdAt: Date;
  technicalMetadata?: {
    deliveryFormat: string | null;
    englishSubtitlesProvided: boolean;
    castCredits: unknown;
    crewCredits: unknown;
    promotionalStillKeys: string[];
  } | null;
  series?: {
    posterKey: string | null;
  } | null;
};

export type HighlightCatalogVideo = CatalogVideo & {
  highlightSeconds: number[];
};

const getApprovedCatalogVideosCached = unstable_cache(
  async () =>
    prisma.video.findMany({
      where: getViewerReadyCatalogWhere(),
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        technicalMetadata: {
          select: {
            deliveryFormat: true,
            englishSubtitlesProvided: true,
            castCredits: true,
            crewCredits: true,
            promotionalStillKeys: true
          }
        },
        series: {
          select: {
            posterKey: true
          }
        }
      }
    }),
  ['approved-catalog-videos'],
  { revalidate: 60, tags: ['approved-catalog-videos'] }
);

export async function getApprovedCatalogVideos() {
  if (!process.env.DATABASE_URL?.trim()) {
    return [];
  }

  const videos = (await getApprovedCatalogVideosCached()) as CatalogVideo[];
  return videos.map((video) => ({
    ...video,
    posterKey: video.posterKey ?? video.series?.posterKey ?? null
  }));
}

const getApprovedHighlightVideosCached = unstable_cache(
  async () =>
    prisma.video.findMany({
      where: getViewerReadyCatalogWhere(),
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
        technicalMetadata: {
          select: {
            promotionalStillKeys: true
          }
        },
        id: true,
        title: true,
        description: true,
        priceTier: true,
        posterKey: true,
        genres: true,
        durationSec: true,
        releaseYear: true,
        videoType: true,
        ageRating: true,
        category: true,
        createdAt: true,
        highlightSeconds: true,
        series: {
          select: {
            posterKey: true
          }
        }
      }
    }),
  ['approved-highlight-videos'],
  { revalidate: 60, tags: ['approved-highlight-videos', 'approved-catalog-videos'] }
);

export async function getApprovedHighlightVideos() {
  if (!process.env.DATABASE_URL?.trim()) {
    return [];
  }

  const videos = (await getApprovedHighlightVideosCached()) as HighlightCatalogVideo[];
  return videos.map((video) => ({
    ...video,
    posterKey: video.posterKey ?? video.series?.posterKey ?? null
  }));
}

export function revalidateApprovedCatalog() {
  revalidateTag('approved-catalog-videos');
  revalidateTag('approved-highlight-videos');
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/highlights');
  revalidatePath('/tv');
}
