import { getAvailableProgressiveQualities, type ProgressivePlaybackQuality } from './playback-quality';
import { env } from './env';
import { getBucketForStorageKey, getObjectMetadata } from './r2';
import { normalizeMediaKey } from './media';

export type PlaybackAssetSnapshot = {
  storageConfigured: boolean;
  progressiveKey: string | null;
  fallbackProgressiveKey: string | null;
  masterProgressiveKey: string | null;
  progressiveReady: boolean;
  fallbackProgressiveReady: boolean;
  masterProgressiveReady: boolean;
  availableProgressiveQualities: ProgressivePlaybackQuality[];
  ready: boolean;
};

function hasConfiguredStorage() {
  const endpoint = (env.R2_ENDPOINT || '').trim();
  const accessKey = (env.R2_ACCESS_KEY_ID || '').trim();
  const secretKey = (env.R2_SECRET_ACCESS_KEY || '').trim();

  return Boolean(endpoint && accessKey && secretKey);
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
  _videoId: string,
  progressiveKey?: string | null,
  fallbackProgressiveKey?: string | null,
  masterProgressiveKey?: string | null
): Promise<PlaybackAssetSnapshot> {
  const normalizedProgressiveKey = normalizeMediaKey(progressiveKey);
  const normalizedFallbackProgressiveKey = normalizeMediaKey(fallbackProgressiveKey);
  const normalizedMasterProgressiveKey = normalizeMediaKey(masterProgressiveKey);
  const storageConfigured = hasConfiguredStorage();

  const [progressiveReady, fallbackProgressiveReady, masterProgressiveReady] = await Promise.all([
    objectExists(normalizedProgressiveKey, getBucketForStorageKey(normalizedProgressiveKey)),
    objectExists(normalizedFallbackProgressiveKey, getBucketForStorageKey(normalizedFallbackProgressiveKey)),
    objectExists(normalizedMasterProgressiveKey, getBucketForStorageKey(normalizedMasterProgressiveKey))
  ]);

  return {
    storageConfigured,
    progressiveKey: normalizedProgressiveKey,
    fallbackProgressiveKey: normalizedFallbackProgressiveKey,
    masterProgressiveKey: normalizedMasterProgressiveKey,
    progressiveReady,
    fallbackProgressiveReady,
    masterProgressiveReady,
    availableProgressiveQualities: getAvailableProgressiveQualities({
      primaryReady: progressiveReady,
      fallbackReady: fallbackProgressiveReady
    }),
    ready: progressiveReady || fallbackProgressiveReady || masterProgressiveReady
  };
}
