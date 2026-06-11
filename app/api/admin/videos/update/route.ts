import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { prisma } from '@/lib/db';
import { assertUploadedObjectExists } from '@/lib/uploaded-assets';
import { PRIMARY_CATEGORY_OPTIONS, normalizeSelectedGenres } from '@/lib/video-taxonomy';

const PRICE_TIERS = ['SNACK', 'STANDARD', 'PREMIERE'] as const;
const RIGHTS_TIERS = ['SHARED', 'EXCLUSIVE'] as const;
const VIDEO_TYPES = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'] as const;
const AGE_RATINGS = ['ALL', 'PG13', 'PG16', 'PG18'] as const;
const AVAILABILITY_REGIONS = ['GLOBAL', 'AFRICA'] as const;

function normalizeList(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth || auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'General';
    const videoType = typeof body.videoType === 'string' ? body.videoType.trim() : 'FEATURE';
    const ageRating = typeof body.ageRating === 'string' ? body.ageRating.trim() : 'ALL';
    const priceTier = typeof body.priceTier === 'string' ? body.priceTier.trim() : 'STANDARD';
    const rightsTier = typeof body.rightsTier === 'string' ? body.rightsTier.trim() : 'SHARED';
    const releaseYear = Math.floor(Number(body.releaseYear ?? 0));
    const originalLanguage = typeof body.originalLanguage === 'string' ? body.originalLanguage.trim().toLowerCase() : 'en';
    const genres = normalizeSelectedGenres(normalizeList(body.genres));
    const contentWarnings = normalizeList(body.contentWarnings);
    const licensedTerritories = normalizeList(body.licensedTerritories);
    const availabilityRegion = typeof body.availabilityRegion === 'string' ? body.availabilityRegion.trim() : 'GLOBAL';
    const trailerKey = typeof body.trailerKey === 'string' ? body.trailerKey.trim() || null : null;
    const posterKey = typeof body.posterKey === 'string' ? body.posterKey.trim() || null : null;
    const unlockPrice = Math.round(Number(body.unlockPrice ?? 0));
    const producerRevenueShare = Number(body.producerRevenueShare ?? 70);
    const platformRevenueShare = Number(body.platformRevenueShare ?? 30);
    const taxRevenueShare = Number(body.taxRevenueShare ?? 0);
    const safeReleaseYear =
      Number.isFinite(releaseYear) && releaseYear >= 1900 && releaseYear <= new Date().getFullYear() + 2
        ? releaseYear
        : null;

    if (!videoId) {
      return NextResponse.json({ error: 'Video id is required.' }, { status: 400 });
    }

    if (!PRIMARY_CATEGORY_OPTIONS.includes(category as (typeof PRIMARY_CATEGORY_OPTIONS)[number])) {
      return NextResponse.json({ error: 'Choose a valid primary category.' }, { status: 400 });
    }

    if (!PRICE_TIERS.includes(priceTier as (typeof PRICE_TIERS)[number])) {
      return NextResponse.json({ error: 'Invalid price tier.' }, { status: 400 });
    }
    if (!RIGHTS_TIERS.includes(rightsTier as (typeof RIGHTS_TIERS)[number])) {
      return NextResponse.json({ error: 'Invalid rights tier.' }, { status: 400 });
    }
    if (!VIDEO_TYPES.includes(videoType as (typeof VIDEO_TYPES)[number])) {
      return NextResponse.json({ error: 'Invalid video type.' }, { status: 400 });
    }
    if (!AGE_RATINGS.includes(ageRating as (typeof AGE_RATINGS)[number])) {
      return NextResponse.json({ error: 'Invalid age rating.' }, { status: 400 });
    }
    if (!AVAILABILITY_REGIONS.includes(availabilityRegion as (typeof AVAILABILITY_REGIONS)[number])) {
      return NextResponse.json({ error: 'Invalid availability region.' }, { status: 400 });
    }
    if (!Number.isFinite(unlockPrice) || unlockPrice < 0) {
      return NextResponse.json({ error: 'Unlock price must be a valid number.' }, { status: 400 });
    }
    if (
      ![producerRevenueShare, platformRevenueShare, taxRevenueShare].every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100
      )
    ) {
      return NextResponse.json({ error: 'Enter valid revenue split percentages.' }, { status: 400 });
    }
    if (Math.round((producerRevenueShare + platformRevenueShare + taxRevenueShare) * 100) / 100 !== 100) {
      return NextResponse.json({ error: 'Revenue split must add up to 100%.' }, { status: 400 });
    }

    await assertUploadedObjectExists(trailerKey, 'Trailer MP4');
    await assertUploadedObjectExists(posterKey, 'Poster artwork');

    const techData: Record<string, unknown> = { licensedTerritories, availabilityRegion };
    if (trailerKey) techData.trailerKey = trailerKey;

    const videoData: Record<string, unknown> = {
      title,
      description,
      category,
      videoType: videoType as (typeof VIDEO_TYPES)[number],
      ageRating: ageRating as (typeof AGE_RATINGS)[number],
      priceTier: priceTier as (typeof PRICE_TIERS)[number],
      rightsTier: rightsTier as (typeof RIGHTS_TIERS)[number],
      unlockPrice: unlockPrice > 0 ? unlockPrice : null,
      producerRevenueShare,
      platformRevenueShare,
      taxRevenueShare,
      releaseYear: safeReleaseYear,
      originalLanguage,
      genres,
      contentWarnings
    };
    if (posterKey) videoData.posterKey = posterKey;

    const video = await prisma.video.update({
      where: { id: videoId },
      data: {
        ...videoData,
        technicalMetadata: {
          upsert: {
            where: { videoId },
            create: techData,
            update: techData
          }
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        videoType: true,
        ageRating: true,
        priceTier: true,
        rightsTier: true,
        unlockPrice: true,
        producerRevenueShare: true,
        platformRevenueShare: true,
        taxRevenueShare: true,
        releaseYear: true,
        originalLanguage: true,
        genres: true,
        contentWarnings: true,
        posterKey: true,
        technicalMetadata: {
          select: {
            licensedTerritories: true,
            availabilityRegion: true,
            trailerKey: true,
            masterSourceUrl: true,
            processingStatus: true,
            bunnyStreamVideoId: true,
            bunnyStreamReadyAt: true,
            bunnyStreamError: true,
            hlsManifestKey: true,
            hlsReadyAt: true
          }
        }
      }
    });

    revalidateApprovedCatalog();

    return NextResponse.json({
      ok: true,
      video: {
        ...video,
        licensedTerritories: video.technicalMetadata?.licensedTerritories ?? [],
        availabilityRegion: video.technicalMetadata?.availabilityRegion ?? 'GLOBAL',
        trailerKey: video.technicalMetadata?.trailerKey ?? null,
        posterKey: video.posterKey ?? null,
        masterSourceUrl: video.technicalMetadata?.masterSourceUrl ?? null,
        processingStatus: video.technicalMetadata?.processingStatus ?? 'NO_MASTER',
        bunnyStreamVideoId: video.technicalMetadata?.bunnyStreamVideoId ?? null,
        bunnyStreamReadyAt: video.technicalMetadata?.bunnyStreamReadyAt ?? null,
        bunnyStreamError: video.technicalMetadata?.bunnyStreamError ?? null,
        hlsManifestReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt)
      }
    });
  } catch (error) {
    console.error('[admin-video-update] failed', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'The video details could not be updated right now.'
      },
      { status: 500 }
    );
  }
}
