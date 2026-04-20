import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { type RightsTierValue } from '@/lib/contracts';
import { normalizeContentWarnings, normalizeLanguageCodes, normalizeSubtitleTracks } from '@/lib/content-metadata';
import { isOwnedUploadKey } from '@/lib/upload-security';

type PriceTierValue = 'SNACK' | 'STANDARD' | 'PREMIERE';
type VideoStatusValue = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
type VideoTypeValue = 'FEATURE' | 'SERIES' | 'SHORT' | 'SKIT' | 'DOCUMENTARY' | 'ADVERT';
type AgeRatingValue = 'ALL' | 'PG13' | 'PG16' | 'PG18';

type SubtitlePayload = {
  label?: string;
  languageCode?: string;
  kind?: string;
  fileKey?: string;
  isDefault?: boolean;
};

type EpisodePayload = {
  seasonNumber?: number;
  episodeNumber?: number;
  title?: string;
  description?: string;
  teaserSec?: number;
  durationSec?: number;
  highlightSeconds?: number[];
  r2Key?: string;
  posterKey?: string | null;
  subtitleTracks?: SubtitlePayload[];
};

type DeliveryMetadataPayload = {
  deliveryResolution?: string;
  has4kMaster?: boolean;
  deliveryFormat?: string;
  deliveryNotes?: string;
  promotionalStillKeys?: string[];
  castCredits?: unknown;
  crewCredits?: unknown;
  englishSubtitlesProvided?: boolean;
  cleanAudioMasterKey?: string | null;
  masterDeliveryKey?: string | null;
};

type NormalizedDeliveryMetadata = {
  deliveryResolution: 'HD' | '4K';
  has4kMaster: boolean;
  deliveryFormat: string | null;
  deliveryNotes: string | null;
  promotionalStillKeys: string[];
  castCredits: string[];
  crewCredits: string[];
  englishSubtitlesProvided: boolean;
  cleanAudioMasterKey: string | null;
  masterDeliveryKey: string | null;
};

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

function normalizeSubtitlePayload(tracks: SubtitlePayload[] | undefined) {
  return normalizeSubtitleTracks(
    (tracks ?? []).map((track) => ({
      label: track.label ?? '',
      languageCode: track.languageCode ?? '',
      kind: (track.kind ?? 'subtitles') as 'subtitles' | 'captions' | 'sdh',
      fileKey: track.fileKey ?? '',
      isDefault: track.isDefault
    }))
  );
}

function validateOwnedKey(
  key: string | null | undefined,
  userId: string,
  purpose: 'video' | 'poster' | 'subtitle' | 'master' | 'audio_master'
) {
  if (!key) {
    return false;
  }

  return isOwnedUploadKey(key, userId, purpose);
}

function hasSupportedVideoExtension(key: string) {
  return SUPPORTED_VIDEO_EXTENSIONS.some((extension) => key.toLowerCase().endsWith(extension));
}

function normalizeHighlights(values: number[] | undefined) {
  return (values ?? []).filter((value) => Number.isFinite(value) && value >= 0);
}

function normalizeEpisodeNumber(value: number | undefined) {
  const parsed = Math.floor(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeCreditList(value: unknown) {
  const items: string[] = Array.isArray(value)
    ? value
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (typeof item === 'object' && item && 'name' in item && typeof item.name === 'string') {
            return item.name;
          }
          return '';
        })
    : typeof value === 'string'
      ? value.split(/[\r\n,]+/g)
      : [];

  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 120))
    )
  ).slice(0, 80);
}

function normalizeDeliveryMetadata(payload: DeliveryMetadataPayload | undefined, subtitleTracks: ReturnType<typeof normalizeSubtitlePayload>) {
  if (!payload) {
    return null;
  }

  const normalizedResolution = payload.deliveryResolution?.trim().toUpperCase() === '4K' ? '4K' : 'HD';
  const normalizedFormat = payload.deliveryFormat?.trim() ? payload.deliveryFormat.trim().slice(0, 120) : null;
  const normalizedNotes = payload.deliveryNotes?.trim() ? payload.deliveryNotes.trim().slice(0, 4000) : null;
  const promotionalStillKeys = Array.from(
    new Set(
      (payload.promotionalStillKeys ?? [])
        .map((key) => key.trim())
        .filter(Boolean)
    )
  );
  const castCredits = normalizeCreditList(payload.castCredits);
  const crewCredits = normalizeCreditList(payload.crewCredits);
  const englishSubtitlesProvided =
    Boolean(payload.englishSubtitlesProvided) || subtitleTracks.some((track) => track.languageCode === 'en');
  const cleanAudioMasterKey = payload.cleanAudioMasterKey?.trim() || null;
  const masterDeliveryKey = payload.masterDeliveryKey?.trim() || null;

  return {
    deliveryResolution: normalizedResolution,
    has4kMaster: Boolean(payload.has4kMaster) || normalizedResolution === '4K',
    deliveryFormat: normalizedFormat,
    deliveryNotes: normalizedNotes,
    promotionalStillKeys,
    castCredits,
    crewCredits,
    englishSubtitlesProvided,
    cleanAudioMasterKey,
    masterDeliveryKey
  } satisfies NormalizedDeliveryMetadata;
}

function toTechnicalMetadataInput(metadata: NormalizedDeliveryMetadata | null) {
  if (!metadata) {
    return undefined;
  }

  return {
    deliveryResolution: metadata.deliveryResolution,
    has4kMaster: metadata.has4kMaster,
    deliveryFormat: metadata.deliveryFormat,
    deliveryNotes: metadata.deliveryNotes,
    promotionalStillKeys: metadata.promotionalStillKeys,
    englishSubtitlesProvided: metadata.englishSubtitlesProvided,
    cleanAudioMasterKey: metadata.cleanAudioMasterKey,
    masterDeliveryKey: metadata.masterDeliveryKey,
    ...(metadata.castCredits.length ? { castCredits: metadata.castCredits } : {}),
    ...(metadata.crewCredits.length ? { crewCredits: metadata.crewCredits } : {})
  };
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
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
    posterKey,
    deliveryMetadata,
    seriesId,
    episodes,
    targetCreatorUserId
  } = (body ?? {}) as {
    title?: string;
    description?: string;
    videoType?: string;
    ageRating?: string;
    category?: string;
    originalLanguage?: string;
    audioLanguages?: string[];
    contentWarnings?: string[];
    subtitleTracks?: SubtitlePayload[];
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
    deliveryMetadata?: DeliveryMetadataPayload;
    seriesId?: string;
    episodes?: EpisodePayload[];
    targetCreatorUserId?: string;
  };

  const safeTitle = title?.trim();
  const safeDescription = description?.trim();
  const safeCategory = category?.trim() || 'General';
  const safeR2Key = r2Key?.trim() || '';
  const safePosterKey = posterKey?.trim() || null;
  const safeSeriesId = seriesId?.trim() || null;
  const requestedCreatorUserId = typeof targetCreatorUserId === 'string' ? targetCreatorUserId.trim() : '';
  const targetCreatorId = auth.role === 'ADMIN' && requestedCreatorUserId ? requestedCreatorUserId : auth.sub;
  const safeGenres = (genres ?? []).map((value) => value.trim()).filter(Boolean);
  const safeTags = (tags ?? []).map((value) => value.trim()).filter(Boolean);
  const safeHighlights = normalizeHighlights(highlightSeconds);
  const safeOriginalLanguage = normalizeLanguageCodes([(originalLanguage ?? 'en').trim().toLowerCase()])[0] ?? 'en';
  const safeAudioLanguages = normalizeLanguageCodes([safeOriginalLanguage, ...(audioLanguages ?? [])]);
  const safeContentWarnings = normalizeContentWarnings(contentWarnings ?? []);
  const safeSubtitleTracks = normalizeSubtitlePayload(subtitleTracks);
  const safeDeliveryMetadata = normalizeDeliveryMetadata(deliveryMetadata, safeSubtitleTracks);
  const technicalMetadataInput = toTechnicalMetadataInput(safeDeliveryMetadata);

  const safeTeaserSec = Math.max(0, Math.floor(Number(teaserSec ?? 0)));
  const safeDurationSec = Math.max(0, Math.floor(Number(durationSec ?? 0)));
  const currentYear = new Date().getFullYear() + 2;
  const parsedReleaseYear = Math.floor(Number(releaseYear ?? 0));
  const safeReleaseYear =
    Number.isFinite(parsedReleaseYear) && parsedReleaseYear >= 1900 && parsedReleaseYear <= currentYear
      ? parsedReleaseYear
      : null;

  if (!priceTier || !rightsTier || !isPriceTier(priceTier) || !isRightsTier(rightsTier)) {
    return NextResponse.json({ error: 'Invalid pricing or rights tier' }, { status: 400 });
  }

  const safeVideoType: VideoTypeValue = isVideoType(videoType) ? videoType : 'FEATURE';
  const safeAgeRating: AgeRatingValue = isAgeRating(ageRating) ? ageRating : 'ALL';
  const pendingStatus: VideoStatusValue = 'PENDING';

  const targetUser = await prisma.user.findUnique({
    where: { id: targetCreatorId },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'Selected producer account was not found.' }, { status: 404 });
  }

  await prisma.creatorProfile.upsert({
    where: { userId: targetCreatorId },
    update: {},
    create: {
      userId: targetCreatorId,
      displayName: targetUser.name?.trim() || targetUser.email.split('@')[0]
    }
  });

  if (safeDeliveryMetadata?.promotionalStillKeys.some((key) => !validateOwnedKey(key, auth.sub, 'poster'))) {
    return NextResponse.json({ error: 'One or more promotional still uploads are invalid for this studio account.' }, { status: 400 });
  }

  if (safeDeliveryMetadata?.cleanAudioMasterKey && !validateOwnedKey(safeDeliveryMetadata.cleanAudioMasterKey, auth.sub, 'audio_master')) {
    return NextResponse.json({ error: 'The clean audio master upload is invalid for this studio account.' }, { status: 400 });
  }

  if (safeDeliveryMetadata?.masterDeliveryKey && !validateOwnedKey(safeDeliveryMetadata.masterDeliveryKey, auth.sub, 'master')) {
    return NextResponse.json({ error: 'The delivery master upload is invalid for this studio account.' }, { status: 400 });
  }

  if (safeVideoType !== 'SERIES') {
    if (!safeTitle || !safeDescription || !safeDurationSec || !safeR2Key) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!hasSupportedVideoExtension(safeR2Key) || !validateOwnedKey(safeR2Key, auth.sub, 'video')) {
      return NextResponse.json({ error: 'Upload MP4 or WebM video files that belong to your studio account.' }, { status: 400 });
    }

    if (safePosterKey && !validateOwnedKey(safePosterKey, auth.sub, 'poster')) {
      return NextResponse.json({ error: 'Poster upload is invalid for this studio account.' }, { status: 400 });
    }

    if (safeSubtitleTracks.some((track) => !validateOwnedKey(track.fileKey, auth.sub, 'subtitle'))) {
      return NextResponse.json({ error: 'One or more subtitle uploads are invalid for this studio account.' }, { status: 400 });
    }

    const hasExplicitDefaultSubtitle = safeSubtitleTracks.some((track) => track.isDefault);

    const video = await prisma.video.create({
      data: {
        creatorId: targetCreatorId,
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
          : undefined,
        technicalMetadata: technicalMetadataInput
          ? {
              create: technicalMetadataInput
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

    return NextResponse.json({ ok: true, videoId: video.id, requiresContract: true });
  }

  const safeEpisodes = (episodes ?? []).map((episode) => {
    const normalizedSubtitleTracks = normalizeSubtitlePayload(episode.subtitleTracks);
    return {
      seasonNumber: normalizeEpisodeNumber(episode.seasonNumber),
      episodeNumber: normalizeEpisodeNumber(episode.episodeNumber),
      title: episode.title?.trim() || '',
      description: episode.description?.trim() || '',
      teaserSec: Math.max(0, Math.floor(Number(episode.teaserSec ?? 0))),
      durationSec: Math.max(0, Math.floor(Number(episode.durationSec ?? 0))),
      highlightSeconds: normalizeHighlights(episode.highlightSeconds),
      r2Key: episode.r2Key?.trim() || '',
      posterKey: episode.posterKey?.trim() || null,
      subtitleTracks: normalizedSubtitleTracks
    };
  });
  const requestedEpisodeSlots = new Set<string>();

  if (!safeEpisodes.length) {
    return NextResponse.json({ error: 'Add at least one episode to this season.' }, { status: 400 });
  }

  for (const episode of safeEpisodes) {
    const slotKey = `${episode.seasonNumber}:${episode.episodeNumber}`;
    if (requestedEpisodeSlots.has(slotKey)) {
      return NextResponse.json({ error: `Season ${episode.seasonNumber} episode ${episode.episodeNumber} was added more than once.` }, { status: 400 });
    }
    requestedEpisodeSlots.add(slotKey);

    if (
      !episode.seasonNumber ||
      !episode.episodeNumber ||
      !episode.title ||
      !episode.description ||
      !episode.durationSec ||
      !episode.r2Key
    ) {
      return NextResponse.json({ error: 'Each episode needs a title, synopsis, season, episode number, runtime, and uploaded video.' }, { status: 400 });
    }

    if (!hasSupportedVideoExtension(episode.r2Key) || !validateOwnedKey(episode.r2Key, auth.sub, 'video')) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid video upload.` }, { status: 400 });
    }

    if (episode.posterKey && !validateOwnedKey(episode.posterKey, auth.sub, 'poster')) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid poster upload.` }, { status: 400 });
    }

    if (episode.subtitleTracks.some((track) => !validateOwnedKey(track.fileKey, auth.sub, 'subtitle'))) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid subtitle upload.` }, { status: 400 });
    }
  }

  if (safeSeriesId) {
    const series = await prisma.video.findFirst({
      where: {
        id: safeSeriesId,
        creatorId: targetCreatorId,
        videoType: 'SERIES',
        seriesId: null
      }
    });

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 });
    }

    const existingSlots = new Set(
      (
        await prisma.video.findMany({
          where: {
            seriesId: series.id
          },
          select: {
            seasonNumber: true,
            episodeNumber: true
          }
        })
      ).map((episode) => `${episode.seasonNumber}:${episode.episodeNumber}`)
    );

    for (const episode of safeEpisodes) {
      const slotKey = `${episode.seasonNumber}:${episode.episodeNumber}`;
      if (existingSlots.has(slotKey)) {
        return NextResponse.json({ error: `Season ${episode.seasonNumber} episode ${episode.episodeNumber} already exists in this series.` }, { status: 400 });
      }
    }

    const createdEpisodes = await prisma.$transaction(async (tx) => {
      if (technicalMetadataInput) {
        await tx.videoTechnicalMetadata.upsert({
          where: { videoId: series.id },
          update: technicalMetadataInput,
          create: {
            videoId: series.id,
            ...technicalMetadataInput
          }
        });
      }

      const items = [];

      for (const episode of safeEpisodes) {
        const hasExplicitDefaultSubtitle = episode.subtitleTracks.some((track) => track.isDefault);
        const created = await tx.video.create({
          data: {
            creatorId: targetCreatorId,
            seriesId: series.id,
            seasonNumber: episode.seasonNumber,
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            description: episode.description,
            videoType: 'SERIES',
            ageRating: series.ageRating,
            category: series.category,
            originalLanguage: series.originalLanguage,
            audioLanguages: series.audioLanguages,
            contentWarnings: series.contentWarnings,
            genres: series.genres,
            priceTier: series.priceTier,
            rightsTier: series.rightsTier,
            status: 'PENDING',
            releaseYear: series.releaseYear,
            teaserSec: episode.teaserSec,
            durationSec: episode.durationSec,
            tags: series.tags,
            highlightSeconds: episode.highlightSeconds,
            r2Key: episode.r2Key,
            posterKey: episode.posterKey ?? series.posterKey,
            subtitleTracks: episode.subtitleTracks.length
              ? {
                  create: episode.subtitleTracks.map((track, index) => ({
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
        await tx.moderationItem.create({
          data: {
            videoId: created.id,
            status: 'PENDING'
          }
        });
        items.push(created);
      }

      return items;
    });

    return NextResponse.json({
      ok: true,
      videoId: series.id,
      addedEpisodeIds: createdEpisodes.map((episode) => episode.id),
      requiresContract: false
    });
  }

  if (!safeTitle || !safeDescription) {
    return NextResponse.json({ error: 'Series title and synopsis are required.' }, { status: 400 });
  }

  if (safePosterKey && !validateOwnedKey(safePosterKey, auth.sub, 'poster')) {
    return NextResponse.json({ error: 'Series poster upload is invalid for this studio account.' }, { status: 400 });
  }

  const totalDurationSec = safeEpisodes.reduce((sum, episode) => sum + episode.durationSec, 0);

  const result = await prisma.$transaction(async (tx) => {
    const series = await tx.video.create({
      data: {
        creatorId: targetCreatorId,
        title: safeTitle,
        description: safeDescription,
        videoType: 'SERIES',
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
        teaserSec: 0,
        durationSec: totalDurationSec,
        tags: safeTags,
        highlightSeconds: [],
        r2Key: null,
        posterKey: safePosterKey,
        technicalMetadata: technicalMetadataInput
          ? {
              create: technicalMetadataInput
            }
          : undefined
      }
    });

    const createdEpisodes = [];
    for (const episode of safeEpisodes) {
      const hasExplicitDefaultSubtitle = episode.subtitleTracks.some((track) => track.isDefault);
      const created = await tx.video.create({
        data: {
          creatorId: targetCreatorId,
          seriesId: series.id,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          videoType: 'SERIES',
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
          teaserSec: episode.teaserSec,
          durationSec: episode.durationSec,
          tags: safeTags,
          highlightSeconds: episode.highlightSeconds,
          r2Key: episode.r2Key,
          posterKey: episode.posterKey ?? safePosterKey,
          subtitleTracks: episode.subtitleTracks.length
            ? {
                create: episode.subtitleTracks.map((track, index) => ({
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
      createdEpisodes.push(created);
    }

    await tx.moderationItem.create({
      data: {
        videoId: series.id,
        status: 'PENDING'
      }
    });

    return { series, createdEpisodes };
  });

  return NextResponse.json({
    ok: true,
    videoId: result.series.id,
    addedEpisodeIds: result.createdEpisodes.map((episode) => episode.id),
    requiresContract: true
  });
}
