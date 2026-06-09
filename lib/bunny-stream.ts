import crypto from 'crypto';
import { env } from './env';

const BUNNY_STREAM_API_BASE_URL = 'https://video.bunnycdn.com';
const BUNNY_STREAM_TUS_BASE_URL = 'https://video.bunnycdn.com/tusupload';

export type BunnyStreamAssetKind = 'movie' | 'trailer';

export type BunnyStreamWebhookStatus =
  | 'queued'
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'encoding'
  | 'ready'
  | 'failed';

export type BunnyStreamVideoDetails = {
  videoId: string;
  libraryId: string;
  status: BunnyStreamWebhookStatus;
  encodeProgress: number | null;
  availableResolutions: string[];
  length: number | null;
  transcodingMessages: string[];
};

function trimSlashes(value: string) {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getBunnyStreamLibraryId() {
  if (!env.BUNNY_STREAM_LIBRARY_ID) {
    throw new Error('BUNNY_STREAM_LIBRARY_ID is required for Bunny Stream uploads.');
  }

  return env.BUNNY_STREAM_LIBRARY_ID;
}

function getApiKey() {
  if (!env.BUNNY_STREAM_API_KEY) {
    throw new Error('BUNNY_STREAM_API_KEY is required for Bunny Stream uploads.');
  }

  return env.BUNNY_STREAM_API_KEY;
}

function getReadonlyApiKey() {
  if (!env.BUNNY_STREAM_READONLY_API_KEY) {
    throw new Error('BUNNY_STREAM_READONLY_API_KEY is required for Bunny Stream webhooks.');
  }

  return env.BUNNY_STREAM_READONLY_API_KEY;
}

function getPullZone() {
  if (!env.BUNNY_STREAM_PULL_ZONE) {
    throw new Error('BUNNY_STREAM_PULL_ZONE is required for Bunny Stream playback URLs.');
  }

  return trimSlashes(env.BUNNY_STREAM_PULL_ZONE);
}

function getPlayerHost() {
  return trimSlashes(env.BUNNY_STREAM_PLAYER_HOST || 'player.mediadelivery.net');
}

export function hasConfiguredBunnyStream() {
  return Boolean(
    env.BUNNY_STREAM_LIBRARY_ID &&
      env.BUNNY_STREAM_API_KEY &&
      env.BUNNY_STREAM_READONLY_API_KEY &&
      env.BUNNY_STREAM_PULL_ZONE
  );
}

export async function createBunnyStreamVideo(input: { title: string; collectionId?: string | null }) {
  const libraryId = getBunnyStreamLibraryId();
  const response = await fetch(`${BUNNY_STREAM_API_BASE_URL}/library/${encodeURIComponent(libraryId)}/videos`, {
    method: 'POST',
    headers: {
      AccessKey: getApiKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: input.title,
      ...(input.collectionId ? { collectionId: input.collectionId } : {})
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload?.guid !== 'string') {
    throw new Error(
      `Bunny Stream video creation failed (${response.status}): ${typeof payload?.message === 'string' ? payload.message : response.statusText}`
    );
  }

  return {
    libraryId,
    videoId: payload.guid as string
  };
}

export async function getBunnyStreamVideo(videoId: string, libraryId = getBunnyStreamLibraryId()): Promise<BunnyStreamVideoDetails> {
  const response = await fetch(
    `${BUNNY_STREAM_API_BASE_URL}/library/${encodeURIComponent(libraryId)}/videos/${encodeURIComponent(videoId)}`,
    {
      method: 'GET',
      headers: {
        AccessKey: getApiKey()
      },
      cache: 'no-store'
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `Bunny Stream status sync failed (${response.status}): ${
        typeof payload?.message === 'string' ? payload.message : response.statusText
      }`
    );
  }

  const availableResolutions = String(payload?.availableResolutions ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const transcodingMessages = Array.isArray(payload?.transcodingMessages)
    ? payload.transcodingMessages
        .map((item) => {
          if (typeof item === 'string') return item.trim();
          if (item && typeof item === 'object' && 'message' in item && typeof item.message === 'string') {
            return item.message.trim();
          }
          return '';
        })
        .filter(Boolean)
    : [];

  return {
    videoId,
    libraryId,
    status: mapBunnyStreamStatus(payload?.status),
    encodeProgress:
      Number.isFinite(payload?.encodeProgress) ? Math.max(0, Math.min(100, Math.trunc(payload.encodeProgress))) : null,
    availableResolutions,
    length: Number.isFinite(payload?.length) ? Math.max(0, Math.trunc(payload.length)) : null,
    transcodingMessages
  };
}

export function createBunnyTusUploadSignature(videoId: string, expiresInSeconds = 60 * 60 * 12) {
  const libraryId = getBunnyStreamLibraryId();
  const expirationTime = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = crypto
    .createHash('sha256')
    .update(`${libraryId}${getApiKey()}${expirationTime}${videoId}`)
    .digest('hex');

  return {
    endpoint: BUNNY_STREAM_TUS_BASE_URL,
    libraryId,
    videoId,
    authorizationExpire: String(expirationTime),
    authorizationSignature: signature
  };
}

export function getBunnyStreamEmbedUrl(videoId: string) {
  return `https://${getPlayerHost()}/embed/${encodeURIComponent(getBunnyStreamLibraryId())}/${encodeURIComponent(videoId)}`;
}

export function getBunnyStreamDirectPlayUrl(videoId: string) {
  return `https://${getPlayerHost()}/play/${encodeURIComponent(getBunnyStreamLibraryId())}/${encodeURIComponent(videoId)}`;
}

export function getBunnyStreamHlsUrl(videoId: string) {
  return `https://${getPullZone()}.b-cdn.net/${encodeURIComponent(videoId)}/playlist.m3u8`;
}

export function getBunnyStreamThumbnailUrl(videoId: string) {
  return `https://${getPullZone()}.b-cdn.net/${encodeURIComponent(videoId)}/thumbnail.jpg`;
}

export function hasReadyBunnyMovieStream(video: {
  technicalMetadata?: {
    bunnyStreamVideoId?: string | null;
    bunnyStreamReadyAt?: Date | string | null;
  } | null;
}) {
  return Boolean(video.technicalMetadata?.bunnyStreamVideoId && video.technicalMetadata?.bunnyStreamReadyAt);
}

export function getBunnyTrailerPlaybackUrl(video: {
  technicalMetadata?: {
    trailerStreamVideoId?: string | null;
    trailerStreamReadyAt?: Date | string | null;
    trailerKey?: string | null;
  } | null;
} | null | undefined) {
  if (video.technicalMetadata?.trailerStreamVideoId && video.technicalMetadata?.trailerStreamReadyAt) {
    return getBunnyStreamHlsUrl(video.technicalMetadata.trailerStreamVideoId);
  }

  return null;
}

export function mapBunnyStreamStatus(rawStatus: unknown): BunnyStreamWebhookStatus {
  const normalized = String(rawStatus ?? '').trim().toLowerCase();
  if (['0', 'queued'].includes(normalized)) return 'queued';
  if (['1', 'processing'].includes(normalized)) return 'processing';
  if (['2', 'encoding'].includes(normalized)) return 'encoding';
  if (['3', 'finished', '4', 'resolutionfinished', 'ready'].includes(normalized)) return 'ready';
  if (['5', 'failed', 'error', '8', 'presigneduploadfailed'].includes(normalized)) return 'failed';
  if (['6', 'presigneduploadstarted', 'uploading'].includes(normalized)) return 'uploading';
  if (['7', 'presigneduploadfinished', 'uploaded'].includes(normalized)) return 'uploaded';
  return 'processing';
}

export function verifyBunnyStreamWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', getReadonlyApiKey()).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
