import { getObjectMetadata, hasConfiguredBunnyStorage, createSignedStorageUrl } from './bunny-storage';
import { resolveMovieMp4Candidates, type MovieAssetVideo } from './movie-assets';

export async function getMovieMp4StorageStatus(
  video: Pick<MovieAssetVideo, 'primaryStorageKey' | 'fallbackStorageKey' | 'technicalMetadata'>
) {
  const candidates = resolveMovieMp4Candidates(video);
  const bunnyStorageConfigured = hasConfiguredBunnyStorage();

  if (!candidates.length) {
    return {
      candidates,
      selectedKey: null,
      bunnyStorageConfigured,
      error: 'No viewer MP4 candidates found. Attach a primaryStorageKey or fallbackStorageKey with a .mp4 extension, or finish the HLS pipeline.'
    };
  }

  if (bunnyStorageConfigured) {
    for (const key of candidates) {
      try {
        await getObjectMetadata(key);
        return {
          candidates,
          selectedKey: key,
          bunnyStorageConfigured,
          error: null
        };
      } catch {
        // Try next candidate
      }
    }
  }

  return {
    candidates,
    selectedKey: null,
    bunnyStorageConfigured,
    error: bunnyStorageConfigured
      ? `No MP4 file found in Bunny Storage. Tried ${candidates.length} candidate(s).`
      : 'Bunny Storage is not configured. Set BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE, and BUNNY_STORAGE_ENDPOINT.'
  };
}

export async function resolveAvailableMovieMp4Key(
  video: Pick<MovieAssetVideo, 'primaryStorageKey' | 'fallbackStorageKey' | 'technicalMetadata'>
) {
  const status = await getMovieMp4StorageStatus(video);
  return status.selectedKey;
}

/**
 * Generate signed streaming URL for Bunny Storage
 * Returns null if Bunny Storage is not configured
 */
export function getSignedBunnyStorageUrl(storageKey: string, expirationMinutes: number = 120): string | null {
  if (!hasConfiguredBunnyStorage()) {
    return null;
  }
  return createSignedStorageUrl(storageKey, { expiresIn: expirationMinutes * 60 });
}
