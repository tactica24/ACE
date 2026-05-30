import { env } from './env';
import { getObjectMetadata } from './r2';
import { resolveMovieMp4Candidates, type MovieAssetVideo } from './movie-assets';

function hasConfiguredStorage() {
  return Boolean(
    env.R2_ENDPOINT?.trim() &&
      env.R2_ACCESS_KEY_ID?.trim() &&
      env.R2_SECRET_ACCESS_KEY?.trim() &&
      env.R2_BUCKET?.trim()
  );
}

export async function getMovieMp4StorageStatus(
  video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>
) {
  const candidates = resolveMovieMp4Candidates(video);
  const storageConfigured = hasConfiguredStorage();

  if (!candidates.length) {
    return {
      candidates,
      selectedKey: null,
      storageConfigured,
      error: 'No MP4 candidates found. Ensure the video has a masterKey, r2Key, or fallbackR2Key with .mp4 extension.'
    };
  }

  if (!storageConfigured) {
    // If R2 is not configured, return the first candidate but log a warning
    console.warn('[movie-storage] R2 storage is not configured. Returning first candidate:', candidates[0]);
    return {
      candidates,
      selectedKey: candidates[0],
      storageConfigured,
      error: 'R2 storage is not configured. Playback may fail if files are not accessible.'
    };
  }

  // Try each candidate key
  const errors: string[] = [];
  for (const key of candidates) {
    try {
      await getObjectMetadata(key);
      return {
        candidates,
        selectedKey: key,
        storageConfigured,
        error: null
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`Key "${key}": ${errorMsg}`);
      continue;
    }
  }

  // All candidates failed - log detailed error
  console.error('[movie-storage] All MP4 candidates failed in R2:', {
    videoId: (video as any).id,
    candidates,
    errors
  });

  return {
    candidates,
    selectedKey: null,
    storageConfigured,
    error: `No MP4 file found in R2 storage. Tried ${candidates.length} candidate(s). Errors: ${errors.join('; ')}`
  };
}

export async function resolveAvailableMovieMp4Key(
  video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>
) {
  const status = await getMovieMp4StorageStatus(video);
  return status.selectedKey;
}
