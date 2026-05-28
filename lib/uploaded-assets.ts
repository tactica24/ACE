import { env } from './env';
import { getObjectMetadata } from './r2';

function hasR2StorageConfigured() {
  return Boolean(
    env.R2_ENDPOINT?.trim() &&
      env.R2_ACCESS_KEY_ID?.trim() &&
      env.R2_SECRET_ACCESS_KEY?.trim() &&
      env.R2_BUCKET?.trim()
  );
}

export async function assertUploadedObjectExists(key: string | null | undefined, label: string) {
  const normalizedKey = key?.trim();
  if (!normalizedKey || !hasR2StorageConfigured()) return;

  try {
    await getObjectMetadata(normalizedKey);
  } catch (error) {
    console.error('[upload-storage] missing uploaded object', {
      label,
      key: normalizedKey,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`${label} was not found in the ACE R2 upload bucket. Please upload it again before saving.`);
  }
}
