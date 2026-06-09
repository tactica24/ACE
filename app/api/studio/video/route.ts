import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { type RightsTierValue } from '@/lib/contracts';
import { normalizeContentWarnings, normalizeLanguageCodes, normalizeSubtitleTracks } from '@/lib/content-metadata';
import { getObjectBuffer, putObject } from '@/lib/bunny-storage';
import { srtToVtt, ensureVttFilename } from '@/lib/subtitle-convert';
import { buildOwnedUploadKey, getUploadFolderIdFromKey, isOwnedUploadKey, sanitizeUploadFilename } from '@/lib/upload-security';
import { assertUploadedObjectExists } from '@/lib/uploaded-assets';
import { v4 as uuid } from 'uuid';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { normalizeDropboxSourceUrl } from '@/lib/master-source';

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
  primaryStorageKey?: string;
  fallbackStorageKey?: string;
  posterKey?: string | null;
  masterKey?: string | null;
  subtitleTracks?: SubtitlePayload[];
};

type DeliveryMetadataPayload = {
  vendorId?: string;
  studioReleaseTitle?: string;
  countriesOfOrigin?: string[];
  productionCountries?: string[];
  copyrightLine?: string;
  licensedTerritories?: string[];
  localizations?: unknown;
  productAvailability?: unknown;
  landscapeArtworkKey?: string | null;
  deliveryFormat?: string;
  deliveryNotes?: string;
  trailerKey?: string | null;
  promotionalStillKeys?: string[];
  castCredits?: unknown;
  crewCredits?: unknown;
  englishSubtitlesProvided?: boolean;
};

type NormalizedDeliveryMetadata = {
  vendorId: string | null;
  studioReleaseTitle: string | null;
  countriesOfOrigin: string[];
  productionCountries: string[];
  copyrightLine: string | null;
  licensedTerritories: string[];
  localizations: string[];
  productAvailability: string[];
  landscapeArtworkKey: string | null;
  deliveryResolution: 'HD';
  deliveryFormat: string | null;
  deliveryNotes: string | null;
  trailerKey: string | null;
  promotionalStillKeys: string[];
  castCredits: string[];
  crewCredits: string[];
  englishSubtitlesProvided: boolean;
};

const PRICE_TIERS: PriceTierValue[] = ['SNACK', 'STANDARD', 'PREMIERE'];
const RIGHTS_TIERS: RightsTierValue[] = ['SHARED', 'EXCLUSIVE'];
const VIDEO_TYPES: VideoTypeValue[] = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'];
const AGE_RATINGS: AgeRatingValue[] = ['ALL', 'PG13', 'PG16', 'PG18'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4'];
const SUPPORTED_MASTER_EXTENSIONS = ['.mp4'];

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

async function convertSubtitleTracksIfNeeded(tracks: Array<{ fileKey: string; label?: string }>, userId: string) {
  for (const track of tracks) {
    if (!track.fileKey) continue;
    const lower = track.fileKey.toLowerCase();
    if (lower.endsWith('.vtt')) continue;

    // Only handle SRT for now
    if (lower.endsWith('.srt')) {
      try {
        const { buffer } = await getObjectBuffer(track.fileKey);
        const vttBuffer = srtToVtt(buffer);
        const originalName = track.fileKey.split('/').pop() || 'subtitle.srt';
        const newFilename = ensureVttFilename(sanitizeUploadFilename(originalName));
        const newKey = buildOwnedUploadKey({
          userId,
          purpose: 'subtitle',
          filename: newFilename,
          assetId: uuid(),
          folderId: getUploadFolderIdFromKey(track.fileKey)
        });
        await putObject(newKey, vttBuffer, 'text/vtt');
        track.fileKey = newKey;
      } catch (error) {
        console.error('Failed to convert subtitle', track.fileKey, error);
      }
    }
  }
}

function validateOwnedKey(
  key: string | null | undefined,
  userId: string,
  purpose: 'video' | 'trailer' | 'poster' | 'subtitle' | 'master'
) {
  if (!key) {
    return false;
  }

  return isOwnedUploadKey(key, userId, purpose);
}

function hasSupportedVideoExtension(key: string) {
  return SUPPORTED_VIDEO_EXTENSIONS.some((extension) => key.toLowerCase().endsWith(extension));
}

function hasSupportedMasterExtension(key: string) {
  return SUPPORTED_MASTER_EXTENSIONS.some((extension) => key.toLowerCase().endsWith(extension));
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

function normalizeStringList(value: unknown, transform: (item: string) => string = (item) => item) {
  const items: string[] = Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item : ''))
    : typeof value === 'string'
      ? value.split(/[\r\n,]+/g)
      : [];

  return Array.from(
    new Set(
      items
        .map((item) => transform(item.trim()))
        .filter(Boolean)
        .map((item) => item.slice(0, 240))
    )
  ).slice(0, 240);
}

function normalizeLineList(value: unknown) {
  const items: string[] = Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item : ''))
    : typeof value === 'string'
      ? value.split(/\r?\n/g)
      : [];

  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.slice(0, 500))
    )
  ).slice(0, 240);
}

function normalizeDeliveryMetadata(payload: DeliveryMetadataPayload | undefined, subtitleTracks: ReturnType<typeof normalizeSubtitlePayload>) {
  if (!payload) {
    return null;
  }

  const normalizedResolution = 'HD';
  const vendorId = payload.vendorId?.trim() ? payload.vendorId.trim().slice(0, 80) : null;
  const studioReleaseTitle = payload.studioReleaseTitle?.trim() ? payload.studioReleaseTitle.trim().slice(0, 180) : null;
  const countriesOfOrigin = normalizeStringList(payload.countriesOfOrigin, (item) => item.toUpperCase());
  const productionCountries = normalizeStringList(payload.productionCountries, (item) => item.toUpperCase());
  const copyrightLine = payload.copyrightLine?.trim() ? payload.copyrightLine.trim().slice(0, 240) : null;
  const licensedTerritories = normalizeStringList(payload.licensedTerritories, (item) => item.toUpperCase());
  const localizations = normalizeLineList(payload.localizations);
  const productAvailability = normalizeLineList(payload.productAvailability);
  const landscapeArtworkKey = payload.landscapeArtworkKey?.trim() || null;
  const normalizedFormat = payload.deliveryFormat?.trim() ? payload.deliveryFormat.trim().slice(0, 120) : null;
  const normalizedNotes = payload.deliveryNotes?.trim() ? payload.deliveryNotes.trim().slice(0, 4000) : null;
  const trailerKey = payload.trailerKey?.trim() || null;
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

  return {
    vendorId,
    studioReleaseTitle,
    countriesOfOrigin,
    productionCountries,
    copyrightLine,
    licensedTerritories,
    localizations,
    productAvailability,
    landscapeArtworkKey,
    deliveryResolution: normalizedResolution,
    deliveryFormat: normalizedFormat,
    deliveryNotes: normalizedNotes,
    trailerKey,
    promotionalStillKeys,
    castCredits,
    crewCredits,
    englishSubtitlesProvided
  } satisfies NormalizedDeliveryMetadata;
}

function toTechnicalMetadataInput(metadata: NormalizedDeliveryMetadata | null, masterFields?: {
  masterUploadKey?: string | null;
  masterSourceUrl?: string | null;
  masterFileName?: string | null;
  masterFileSize?: number | null;
}) {
  if (!metadata && !masterFields) {
    return undefined;
  }

  return {
    vendorId: metadata?.vendorId ?? null,
    studioReleaseTitle: metadata?.studioReleaseTitle ?? null,
    countriesOfOrigin: metadata?.countriesOfOrigin ?? [],
    productionCountries: metadata?.productionCountries ?? [],
    copyrightLine: metadata?.copyrightLine ?? null,
    licensedTerritories: metadata?.licensedTerritories ?? [],
    localizations: metadata?.localizations ?? [],
    productAvailability: metadata?.productAvailability ?? [],
    landscapeArtworkKey: metadata?.landscapeArtworkKey ?? null,
    deliveryResolution: metadata?.deliveryResolution ?? 'HD',
    deliveryFormat: metadata?.deliveryFormat ?? null,
    deliveryNotes: metadata?.deliveryNotes ?? null,
    trailerKey: metadata?.trailerKey ?? null,
    promotionalStillKeys: metadata?.promotionalStillKeys ?? [],
    englishSubtitlesProvided: metadata?.englishSubtitlesProvided ?? false,
    ...(metadata?.castCredits && metadata.castCredits.length ? { castCredits: metadata.castCredits } : {}),
    ...(metadata?.crewCredits && metadata.crewCredits.length ? { crewCredits: metadata.crewCredits } : {}),
    masterKey: masterFields?.masterUploadKey ?? null,
    masterSourceUrl: masterFields?.masterSourceUrl ?? null,
    masterFileName: masterFields?.masterFileName ?? null,
    masterFileSize: Number.isFinite(masterFields?.masterFileSize)
      ? BigInt(Math.max(0, Math.floor(masterFields?.masterFileSize ?? 0)))
      : null,
    masterUploadedAt: masterFields?.masterUploadKey || masterFields?.masterSourceUrl ? new Date() : undefined,
    processingStatus: masterFields?.masterUploadKey || masterFields?.masterSourceUrl ? 'MASTER_UPLOADED' : 'NO_MASTER'
  };
}

function getDeferredPipelineWarnings(videoIds: string[]) {
  return Array.from(new Set(videoIds.filter(Boolean))).map((videoId) => `${videoId}: Awaiting Bunny Stream processing from the admin upload desk.`);
}

export async function POST(req: NextRequest) {
  const [sessionAuth, creatorLinkAuth] = await Promise.all([
    getAuthFromRequest(req),
    getCreatorLinkAuthFromRequest(req, 'upload')
  ]);
  const auth =
    sessionAuth && (sessionAuth.role === 'CREATOR' || sessionAuth.role === 'ADMIN')
      ? sessionAuth
      : creatorLinkAuth ?? sessionAuth;
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
    primaryStorageKey,
    fallbackStorageKey,
    posterKey,
    masterUploadKey,
    masterSourceUrl,
    masterFileName,
    masterFileSize,
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
    primaryStorageKey?: string;
    fallbackStorageKey?: string;
    posterKey?: string | null;
    masterUploadKey?: string | null;
    masterSourceUrl?: string | null;
    masterFileName?: string | null;
    masterFileSize?: number;
    deliveryMetadata?: DeliveryMetadataPayload;
    seriesId?: string;
    episodes?: EpisodePayload[];
    targetCreatorUserId?: string;
  };

  const safeTitle = title?.trim();
  const safeDescription = description?.trim();
  const safeCategory = category?.trim() || 'General';
  const safePrimaryStorageKey = primaryStorageKey?.trim() || '';
  const safeFallbackStorageKey = fallbackStorageKey?.trim() || '';
  const safePosterKey = posterKey?.trim() || null;
  const safeMasterUploadKey = masterUploadKey?.trim() || null;
  const rawMasterSourceUrl = typeof masterSourceUrl === 'string' ? masterSourceUrl.trim() : '';
  const safeMasterSourceUrl = rawMasterSourceUrl ? normalizeDropboxSourceUrl(rawMasterSourceUrl) : null;
  const safeMasterFileName = masterFileName?.trim() || null;
  const safeMasterFileSize = Number.isFinite(masterFileSize) ? Math.max(0, Math.floor(masterFileSize ?? 0)) : null;
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
  const technicalMetadataInput = toTechnicalMetadataInput(safeDeliveryMetadata, {
    masterUploadKey: safeMasterUploadKey,
    masterSourceUrl: safeMasterSourceUrl,
    masterFileName: safeMasterFileName,
    masterFileSize: safeMasterFileSize
  });

  const safeTeaserSec = Math.max(0, Math.floor(Number(teaserSec ?? 0)));
  const safeDurationSec = Math.max(1, Math.floor(Number(durationSec ?? 1)));
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

  if (safeDeliveryMetadata?.trailerKey && !validateOwnedKey(safeDeliveryMetadata.trailerKey, auth.sub, 'trailer')) {
    return NextResponse.json({ error: 'The trailer upload is invalid for this studio account.' }, { status: 400 });
  }

  if (safeDeliveryMetadata?.landscapeArtworkKey && !validateOwnedKey(safeDeliveryMetadata.landscapeArtworkKey, auth.sub, 'poster')) {
    return NextResponse.json({ error: 'The 16:9 key art upload is invalid for this studio account.' }, { status: 400 });
  }

  if (rawMasterSourceUrl && !safeMasterSourceUrl) {
    return NextResponse.json({ error: 'Provide a valid Dropbox share URL for the movie source.' }, { status: 400 });
  }

  await assertUploadedObjectExists(safeDeliveryMetadata?.trailerKey, 'Trailer MP4');
  await assertUploadedObjectExists(safeDeliveryMetadata?.landscapeArtworkKey, 'Landscape artwork');

  if (safeVideoType !== 'SERIES') {
    if (!safeTitle || !safeDescription || (!safeMasterUploadKey && !safeMasterSourceUrl)) {
      return NextResponse.json({ error: 'Enter the movie details and paste a Dropbox source link for the master video.' }, { status: 400 });
    }

    if (safeMasterUploadKey) {
      if (!hasSupportedMasterExtension(safeMasterUploadKey) || !validateOwnedKey(safeMasterUploadKey, auth.sub, 'master')) {
        return NextResponse.json({ error: 'Please upload a valid final playable MP4 master that belongs to your studio account.' }, { status: 400 });
      }
    }

    if (safePrimaryStorageKey) {
      if (!hasSupportedVideoExtension(safePrimaryStorageKey) || !validateOwnedKey(safePrimaryStorageKey, auth.sub, 'video')) {
        return NextResponse.json({ error: 'Upload a valid 1080p MP4 playback file that belongs to your studio account.' }, { status: 400 });
      }
    }

    if (safeFallbackStorageKey) {
      if (!hasSupportedVideoExtension(safeFallbackStorageKey) || !validateOwnedKey(safeFallbackStorageKey, auth.sub, 'video')) {
        return NextResponse.json({ error: 'Upload a valid 720p MP4 playback file that belongs to your studio account.' }, { status: 400 });
      }
    }

    if (safePosterKey && !validateOwnedKey(safePosterKey, auth.sub, 'poster')) {
      return NextResponse.json({ error: 'Poster upload is invalid for this studio account.' }, { status: 400 });
    }

    if (safeSubtitleTracks.some((track) => !validateOwnedKey(track.fileKey, auth.sub, 'subtitle'))) {
      return NextResponse.json({ error: 'One or more subtitle uploads are invalid for this studio account.' }, { status: 400 });
    }

    await assertUploadedObjectExists(safeMasterUploadKey, 'Final playable MP4 master');
    await assertUploadedObjectExists(safePosterKey, 'Poster artwork');
    for (const track of safeSubtitleTracks) {
      await assertUploadedObjectExists(track.fileKey, 'Subtitle file');
    }

    // Convert uploaded subtitle files to WebVTT when possible (e.g., SRT -> VTT)
    await convertSubtitleTracksIfNeeded(safeSubtitleTracks, auth.sub);

    const hasExplicitDefaultSubtitle = safeSubtitleTracks.some((track) => track.isDefault);

    const video = await prisma.$transaction(async (tx) => {
      const created = await tx.video.create({
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
          primaryStorageKey: safePrimaryStorageKey || null,
          fallbackStorageKey: safeFallbackStorageKey || null,
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

      await tx.moderationItem.create({
        data: {
          videoId: created.id,
          status: 'PENDING'
        }
      });

      return created;
    });

    const pipelineWarnings = getDeferredPipelineWarnings([video.id]);

    return NextResponse.json({
      ok: true,
      videoId: video.id,
      requiresContract: true,
      pipelineStarted: false,
      pipelineWarnings
    });
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
      primaryStorageKey: episode.primaryStorageKey?.trim() || '',
      fallbackStorageKey: episode.fallbackStorageKey?.trim() || '',
      posterKey: episode.posterKey?.trim() || null,
      masterKey: episode.masterKey?.trim() || null,
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
      (!episode.primaryStorageKey && !episode.fallbackStorageKey && !episode.masterKey)
    ) {
      return NextResponse.json({ error: 'Each episode needs a title, synopsis, season, episode number, runtime, and a playable MP4 master.' }, { status: 400 });
    }

    if (episode.primaryStorageKey && (!hasSupportedVideoExtension(episode.primaryStorageKey) || !validateOwnedKey(episode.primaryStorageKey, auth.sub, 'video'))) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid 1080p MP4 upload.` }, { status: 400 });
    }

    if (episode.fallbackStorageKey && (!hasSupportedVideoExtension(episode.fallbackStorageKey) || !validateOwnedKey(episode.fallbackStorageKey, auth.sub, 'video'))) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid 720p MP4 upload.` }, { status: 400 });
    }

    if (episode.posterKey && !validateOwnedKey(episode.posterKey, auth.sub, 'poster')) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid poster upload.` }, { status: 400 });
    }

    if (episode.masterKey && (!hasSupportedMasterExtension(episode.masterKey) || !validateOwnedKey(episode.masterKey, auth.sub, 'master'))) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid playable MP4 master upload.` }, { status: 400 });
    }

    if (episode.subtitleTracks.some((track) => !validateOwnedKey(track.fileKey, auth.sub, 'subtitle'))) {
      return NextResponse.json({ error: `Episode ${episode.seasonNumber}.${episode.episodeNumber} has an invalid subtitle upload.` }, { status: 400 });
    }
  }

  await assertUploadedObjectExists(safePosterKey, 'Series poster artwork');
  for (const episode of safeEpisodes) {
    await assertUploadedObjectExists(
      episode.masterKey || episode.primaryStorageKey || episode.fallbackStorageKey,
      `Episode ${episode.seasonNumber}.${episode.episodeNumber} playable MP4`
    );
    await assertUploadedObjectExists(episode.posterKey, `Episode ${episode.seasonNumber}.${episode.episodeNumber} poster artwork`);
    for (const track of episode.subtitleTracks) {
      await assertUploadedObjectExists(track.fileKey, `Episode ${episode.seasonNumber}.${episode.episodeNumber} subtitle file`);
    }
  }

  // Convert episode subtitle files to WebVTT when possible (e.g., SRT -> VTT)
  for (const episode of safeEpisodes) {
    if (episode.subtitleTracks && episode.subtitleTracks.length) {
      await convertSubtitleTracksIfNeeded(episode.subtitleTracks as any, auth.sub);
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
        const playableKey = episode.masterKey || episode.primaryStorageKey || episode.fallbackStorageKey || null;
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
              primaryStorageKey: episode.primaryStorageKey || null,
              fallbackStorageKey: episode.fallbackStorageKey || null,
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
                : undefined,
              technicalMetadata: {
                create: {
                  masterKey: playableKey,
                  masterFileName: playableKey ? `Episode ${episode.seasonNumber}.${episode.episodeNumber} Master` : null,
                  masterFileSize: null,
                  masterUploadedAt: playableKey ? new Date() : undefined,
                  processingStatus: playableKey ? 'MASTER_UPLOADED' : 'NO_MASTER'
                }
              }
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

    const pipelineWarnings = getDeferredPipelineWarnings(createdEpisodes.map((episode) => episode.id));

    return NextResponse.json({
      ok: true,
      videoId: series.id,
      addedEpisodeIds: createdEpisodes.map((episode) => episode.id),
      requiresContract: false,
      pipelineStarted: false,
      pipelineWarnings
    });
  }

  if (!safeTitle || !safeDescription) {
    return NextResponse.json({ error: 'Series title and synopsis are required.' }, { status: 400 });
  }

  if (!safePosterKey) {
    return NextResponse.json({ error: 'Upload one poster artwork file for this series.' }, { status: 400 });
  }

  if (!validateOwnedKey(safePosterKey, auth.sub, 'poster')) {
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
        primaryStorageKey: null,
        fallbackStorageKey: null,
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
      const playableKey = episode.masterKey || episode.primaryStorageKey || episode.fallbackStorageKey || null;
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
          primaryStorageKey: episode.primaryStorageKey || null,
          fallbackStorageKey: episode.fallbackStorageKey || null,
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
            : undefined,
          technicalMetadata: {
            create: {
              masterKey: playableKey,
              masterFileName: playableKey ? `Episode ${episode.seasonNumber}.${episode.episodeNumber} Master` : null,
              masterFileSize: null,
              masterUploadedAt: playableKey ? new Date() : undefined,
              processingStatus: playableKey ? 'MASTER_UPLOADED' : 'NO_MASTER'
            }
          }
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

  const pipelineWarnings = getDeferredPipelineWarnings(result.createdEpisodes.map((episode) => episode.id));

  return NextResponse.json({
    ok: true,
    videoId: result.series.id,
    addedEpisodeIds: result.createdEpisodes.map((episode) => episode.id),
    requiresContract: true,
    pipelineStarted: false,
    pipelineWarnings
  });
}
