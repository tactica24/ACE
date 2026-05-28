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
      storageConfigured
    };
  }

  if (!storageConfigured) {
    return {
      candidates,
      selectedKey: candidates[0],
      storageConfigured
    };
  }

  for (const key of candidates) {
    try {
      await getObjectMetadata(key);
      return {
        candidates,
        selectedKey: key,
        storageConfigured
      };
    } catch {
      continue;
    }
  }

  return {
    candidates,
    selectedKey: null,
    storageConfigured
  };
}

export async function resolveAvailableMovieMp4Key(
  video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>
) {
  const status = await getMovieMp4StorageStatus(video);
  return status.selectedKey;
}
