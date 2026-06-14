import { Prisma, PriceTier, RightsTier, VideoType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { onlyCatalogVideosWithPosters } from "@/lib/catalog-posters";
import { prisma } from "@/lib/db";
import { getFinanceConfig } from "@/lib/finance";
import { formatRecordedCharge } from "@/lib/format";
import { getMoviePosterUrlFromCandidates } from "@/lib/movie-assets";
import { getRegionalCurrency } from "@/lib/pricing";
import { getRegionalPriceForVideo } from "@/lib/video-pricing";
import { getViewerReadyCatalogWhere } from "@/lib/video-visibility";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(24),
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  type: z.nativeEnum(VideoType).optional(),
  sort: z.enum(["newest", "oldest", "title"]).default("newest"),
});

type MobileCatalogVideo = {
  id: string;
  seriesId: string | null;
  title: string;
  description: string;
  videoType: VideoType;
  ageRating: string;
  category: string;
  genres: string[];
  teaserSec: number;
  durationSec: number;
  releaseYear: number | null;
  posterKey: string | null;
  priceTier: PriceTier;
  rightsTier: RightsTier;
  series: {
    posterKey: string | null;
  } | null;
  technicalMetadata: {
    vendorId: string | null;
    studioReleaseTitle: string | null;
    countriesOfOrigin: string[];
    licensedTerritories: string[];
  } | null;
};

function buildMobileCatalogSearchWhere(
  query: string,
): Prisma.VideoWhereInput | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const tokens = normalizedQuery
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 5);

  return {
    OR: [
      { title: { contains: normalizedQuery, mode: "insensitive" } },
      { description: { contains: normalizedQuery, mode: "insensitive" } },
      { category: { contains: normalizedQuery, mode: "insensitive" } },
      ...tokens.map((token) => ({ genres: { has: token } })),
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { limit, q, category, type, sort } = querySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      category: searchParams.get("category") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      sort: searchParams.get("sort") ?? undefined,
    });
    const searchQuery = q?.trim() ?? "";
    const categoryFilter = category?.trim() ?? "";
    const typeFilter = type;
    const searchWhere = buildMobileCatalogSearchWhere(searchQuery);
    const filters: Prisma.VideoWhereInput[] = [getViewerReadyCatalogWhere()];
    if (searchWhere) {
      filters.push(searchWhere);
    }
    if (categoryFilter && categoryFilter.toLowerCase() !== "all") {
      filters.push({
        category: {
          equals: categoryFilter,
          mode: "insensitive",
        },
      });
    }
    if (typeFilter) {
      filters.push({ videoType: typeFilter });
    }
    const where: Prisma.VideoWhereInput = { AND: filters };

    const orderBy =
      sort === "oldest"
        ? [{ createdAt: "asc" as const }]
        : sort === "title"
          ? [{ title: "asc" as const }]
          : [{ createdAt: "desc" as const }];

    const videos = (await prisma.video.findMany({
      where,
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
        posterKey: true,
        priceTier: true,
        rightsTier: true,
        series: {
          select: {
            posterKey: true,
          },
        },
        technicalMetadata: {
          select: {
            vendorId: true,
            studioReleaseTitle: true,
            countriesOfOrigin: true,
            licensedTerritories: true,
          },
        },
      },
      orderBy,
      take: limit + 1,
    })) as MobileCatalogVideo[];
    const posterBackedVideos = onlyCatalogVideosWithPosters(videos);
    const hasMore = posterBackedVideos.length > limit;
    const filteredVideos = posterBackedVideos.slice(0, limit);

    const pricingConfig = await getFinanceConfig();

    const titles = filteredVideos.map((video) => {
      const price = getRegionalPriceForVideo(request, video, pricingConfig);

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        videoType: video.videoType,
        ageRating: video.ageRating,
        category: video.category,
        genres: video.genres,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec,
        releaseYear: video.releaseYear,
        posterKey: video.posterKey ?? video.series?.posterKey ?? null,
        posterUrl: getMoviePosterUrlFromCandidates(video, video, video.series),
        metadata: {
          vendorId: video.technicalMetadata?.vendorId ?? null,
          studioReleaseTitle:
            video.technicalMetadata?.studioReleaseTitle ?? null,
          countriesOfOrigin: video.technicalMetadata?.countriesOfOrigin ?? [],
          licensedTerritories:
            video.technicalMetadata?.licensedTerritories ?? [],
        },
        priceTier: video.priceTier,
        rightsTier: video.rightsTier,
        price: {
          currency: price.currency,
          minorUnits: price.amountMinor,
          formatted: formatRecordedCharge(price),
        },
        heroLabel: video.videoType === "SERIES" ? "SERIES" : "FILM",
      };
    });

    const currency =
      titles[0]?.price.currency ?? getRegionalCurrency(request).currency;

    return NextResponse.json(
      {
        titles,
        currency,
        total: titles.length,
        hasMore,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Mobile titles API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch titles" },
      { status: 500 },
    );
  }
}
