import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import { type PriceTierValue } from '@/lib/media-types';

export type CatalogVideo = {
  id: string;
  title: string;
  description: string;
  priceTier: PriceTierValue;
  posterKey: string | null;
  genres: string[];
  durationSec: number;
  releaseYear: number | null;
  videoType: string;
  ageRating: string;
  category: string;
  createdAt: Date;
};

export type HighlightCatalogVideo = CatalogVideo & {
  highlightSeconds: number[];
};

const getApprovedCatalogVideosCached = unstable_cache(
  async () =>
    prisma.video.findMany({
      where: { status: 'APPROVED', seriesId: null },
      orderBy: { createdAt: 'desc' },
      take: 60
    }),
  ['approved-catalog-videos'],
  { revalidate: 60, tags: ['approved-catalog-videos'] }
);

export async function getApprovedCatalogVideos() {
  return getApprovedCatalogVideosCached() as Promise<CatalogVideo[]>;
}

const getApprovedHighlightVideosCached = unstable_cache(
  async () =>
    prisma.video.findMany({
      where: { status: 'APPROVED', seriesId: null },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: {
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
        highlightSeconds: true
      }
    }),
  ['approved-highlight-videos'],
  { revalidate: 60, tags: ['approved-highlight-videos', 'approved-catalog-videos'] }
);

export async function getApprovedHighlightVideos() {
  return getApprovedHighlightVideosCached() as Promise<HighlightCatalogVideo[]>;
}

export function revalidateApprovedCatalog() {
  revalidateTag('approved-catalog-videos');
  revalidateTag('approved-highlight-videos');
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/highlights');
  revalidatePath('/tv');
}
