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

const getApprovedCatalogVideosCached = unstable_cache(
  async () =>
    prisma.video.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 60
    }),
  ['approved-catalog-videos'],
  { revalidate: 60, tags: ['approved-catalog-videos'] }
);

export async function getApprovedCatalogVideos() {
  return getApprovedCatalogVideosCached() as Promise<CatalogVideo[]>;
}

export function revalidateApprovedCatalog() {
  revalidateTag('approved-catalog-videos');
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/highlights');
  revalidatePath('/tv');
}
