import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { generateContract, type RightsTierValue } from '@/lib/contracts';
import { normalizeContentWarnings, normalizeLanguageCodes, normalizeSubtitleTracks } from '@/lib/content-metadata';

type PriceTierValue = 'SNACK' | 'STANDARD' | 'PREMIERE';
type VideoStatusValue = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
type VideoTypeValue = 'FEATURE' | 'SERIES' | 'SHORT' | 'SKIT' | 'DOCUMENTARY' | 'ADVERT';
type AgeRatingValue = 'ALL' | 'PG13' | 'PG16' | 'PG18';

const PRICE_TIERS: PriceTierValue[] = ['SNACK', 'STANDARD', 'PREMIERE'];
const RIGHTS_TIERS: RightsTierValue[] = ['SHARED', 'EXCLUSIVE'];
const VIDEO_TYPES: VideoTypeValue[] = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'];
const AGE_RATINGS: AgeRatingValue[] = ['ALL', 'PG13', 'PG16', 'PG18'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm'];

function isPriceTier(value: string | undefined): value is PriceTierValue {
  return Boolean(value && PRICE_TIERS.includes(value as PriceTierValue));
}

function isRightsTier(value: string | undefined): value is RightsTierValue {
  return Boolean(value && RIGHTS_TIERS.includes(value as RightsTierValue));
}

function isVideoType(value: string | undefined): value is VideoTypeValue {
  return Boolean(value && VIDEO_TYPES.includes(value as VideoTypeValue));
}

function isAgeRating(value: string | undefined): value is AgeRatingValue {
  return Boolean(value && AGE_RATINGS.includes(value as AgeRatingValue));
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    videoType,
    ageRating,
    category,
    originalLanguage,
    audioLanguages,
    contentWarnings,
    subtitleTracks,
    genres,
    priceTier,
    rightsTier,
    releaseYear,
    teaserSec,
    durationSec,
    tags,
    highlightSeconds,
    r2Key,
    posterKey
  } = body as {
    title?: string;
    description?: string;
    videoType?: string;
    ageRating?: string;
    category?: string;
    originalLanguage?: string;
    audioLanguages?: string[];
    contentWarnings?: string[];
    subtitleTracks?: Array<{
      label?: string;
      languageCode?: string;
      kind?: string;
      fileKey?: string;
      isDefault?: boolean;
    }>;
    genres?: string[];
    priceTier?: string;
    rightsTier?: string;
    releaseYear?: number;
    teaserSec?: number;
    durationSec?: number;
    tags?: string[];
    highlightSeconds?: number[];
    r2Key?: string;
    posterKey?: string | null;
  };

  const safeTitle = title?.trim();
  const safeDescription = description?.trim();
  const safeCategory = category?.trim() || 'General';
  const safeR2Key = r2Key?.trim() || '';
  const safePosterKey = posterKey?.trim() || null;
  const safeGenres = (genres ?? []).map((value) => value.trim()).filter(Boolean);
  const safeTags = (tags ?? []).map((value) => value.trim()).filter(Boolean);
  const safeHighlights = (highlightSeconds ?? []).filter((value) => Number.isFinite(value) && value >= 0);
  const safeOriginalLanguage = normalizeLanguageCodes([(originalLanguage ?? 'en').trim().toLowerCase()])[0] ?? 'en';
  const safeAudioLanguages = normalizeLanguageCodes([safeOriginalLanguage, ...(audioLanguages ?? [])]);
  const safeContentWarnings = normalizeContentWarnings(contentWarnings ?? []);
  const safeSubtitleTracks = normalizeSubtitleTracks(
    (subtitleTracks ?? []).map((track) => ({
      label: track.label ?? '',
      languageCode: track.languageCode ?? '',
      kind: (track.kind ?? 'subtitles') as 'subtitles' | 'captions' | 'sdh',
      fileKey: track.fileKey ?? '',
      isDefault: track.isDefault
    }))
  );

  const safeTeaserSec = Math.max(0, Math.floor(Number(teaserSec ?? 0)));
  const safeDurationSec = Math.max(0, Math.floor(Number(durationSec ?? 0)));
  const currentYear = new Date().getFullYear() + 2;
  const parsedReleaseYear = Math.floor(Number(releaseYear ?? 0));
  const safeReleaseYear =
    Number.isFinite(parsedReleaseYear) && parsedReleaseYear >= 1900 && parsedReleaseYear <= currentYear
      ? parsedReleaseYear
      : null;

  if (!safeTitle || !safeDescription || !priceTier || !rightsTier || !safeDurationSec || !safeR2Key) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!SUPPORTED_VIDEO_EXTENSIONS.some((extension) => safeR2Key.toLowerCase().endsWith(extension))) {
    return NextResponse.json({ error: 'Upload MP4 or WebM video files for reliable playback.' }, { status: 400 });
  }

  if (!isPriceTier(priceTier) || !isRightsTier(rightsTier)) {
    return NextResponse.json({ error: 'Invalid pricing or rights tier' }, { status: 400 });
  }

  const safeVideoType: VideoTypeValue = isVideoType(videoType) ? videoType : 'FEATURE';
  const safeAgeRating: AgeRatingValue = isAgeRating(ageRating) ? ageRating : 'ALL';
  const pendingStatus: VideoStatusValue = 'PENDING';

  const creatorProfile = await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: {},
    create: {
      userId: auth.sub,
      displayName: auth.email.split('@')[0]
    }
  });

  const hasExplicitDefaultSubtitle = safeSubtitleTracks.some((track) => track.isDefault);

  const video = await prisma.video.create({
    data: {
      creatorId: auth.sub,
      title: safeTitle,
      description: safeDescription,
      videoType: safeVideoType,
      ageRating: safeAgeRating,
      category: safeCategory,
      originalLanguage: safeOriginalLanguage,
      audioLanguages: safeAudioLanguages,
      contentWarnings: safeContentWarnings,
      genres: safeGenres,
      priceTier,
      rightsTier,
      status: pendingStatus,
      releaseYear: safeReleaseYear,
      teaserSec: safeTeaserSec,
      durationSec: safeDurationSec,
      tags: safeTags,
      highlightSeconds: safeHighlights,
      r2Key: safeR2Key,
      posterKey: safePosterKey,
      subtitleTracks: safeSubtitleTracks.length
        ? {
            create: safeSubtitleTracks.map((track, index) => ({
              label: track.label,
              languageCode: track.languageCode,
              kind: track.kind,
              fileKey: track.fileKey,
              isDefault: hasExplicitDefaultSubtitle ? track.isDefault : index === 0
            }))
          }
        : undefined
    }
  });

  await prisma.moderationItem.create({
    data: {
      videoId: video.id,
      status: 'PENDING'
    }
  });

  const payoutSplit = rightsTier === 'EXCLUSIVE' ? creatorProfile.payoutSplitExclusive : creatorProfile.payoutSplitStandard;
  const contractText = generateContract({
    creatorName: creatorProfile.displayName,
    videoTitle: video.title,
    rightsTier,
    payoutSplit
  });

  await prisma.contract.create({
    data: {
      creatorId: creatorProfile.id,
      videoId: video.id,
      rightsTier,
      contractText
    }
  });

  return NextResponse.json({ ok: true, videoId: video.id });
}
