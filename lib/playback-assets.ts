import { getDashManifestKey } from './dash';
import { getHlsMasterKey } from './hls';
import { getAvailableProgressiveQualities, type ProgressivePlaybackQuality } from './playback-quality';
import { getBucketForStorageKey, getObjectMetadata } from './r2';

export type PlaybackAssetSnapshot = {
  storageConfigured: boolean;
  progressiveKey: string | null;
  fallbackProgressiveKey: string | null;
  hlsKey: string;
  dashKey: string;
  progressiveReady: boolean;
  fallbackProgressiveReady: boolean;
  hlsReady: boolean;
  dashReady: boolean;
  availableProgressiveQualities: ProgressivePlaybackQuality[];
  ready: boolean;
};

function hasConfiguredStorage() {
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

  return Boolean(process.env.R2_ENDPOINT?.trim() && process.env.R2_BUCKET?.trim() && accessKey && secretKey);
}

async function objectExists(key: string | null, bucketName?: string) {
  if (!key) {
    return false;
  }

  if (!hasConfiguredStorage()) {
    return false;
  }

  try {
    await getObjectMetadata(key, bucketName);
    return true;
  } catch {
    return false;
  }
}

export async function getPlaybackAssetSnapshot(
  videoId: string,
  progressiveKey?: string | null,
  fallbackProgressiveKey?: string | null
): Promise<PlaybackAssetSnapshot> {
  const normalizedProgressiveKey = progressiveKey?.trim() || null;
  const normalizedFallbackProgressiveKey = fallbackProgressiveKey?.trim() || null;
  const hlsKey = getHlsMasterKey(videoId);
  const dashKey = getDashManifestKey(videoId);
  const storageConfigured = hasConfiguredStorage();
  const hlsBucket = process.env.HLS_R2_BUCKET?.trim() || process.env.R2_BUCKET?.trim() || null;

  const [progressiveReady, fallbackProgressiveReady, hlsReady, dashReady] = await Promise.all([
    objectExists(normalizedProgressiveKey, getBucketForStorageKey(normalizedProgressiveKey)),
    objectExists(normalizedFallbackProgressiveKey, getBucketForStorageKey(normalizedFallbackProgressiveKey)),
    hlsBucket ? objectExists(hlsKey, hlsBucket) : Promise.resolve(false),
    objectExists(dashKey)
  ]);

  return {
    storageConfigured,
    progressiveKey: normalizedProgressiveKey,
    fallbackProgressiveKey: normalizedFallbackProgressiveKey,
    hlsKey,
    dashKey,
    progressiveReady,
    fallbackProgressiveReady,
    hlsReady,
    dashReady,
    availableProgressiveQualities: getAvailableProgressiveQualities({
      primaryReady: progressiveReady,
      fallbackReady: fallbackProgressiveReady
    }),
    ready: progressiveReady || fallbackProgressiveReady || hlsReady || dashReady
  };
}
