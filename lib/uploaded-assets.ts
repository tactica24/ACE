import { getObjectMetadata, hasConfiguredBunnyStorage } from './bunny-storage';

export async function assertUploadedObjectExists(key: string | null | undefined, label: string) {
  const normalizedKey = key?.trim();
  if (!normalizedKey || !hasConfiguredBunnyStorage()) return;

  try {
    await getObjectMetadata(normalizedKey);
  } catch (error) {
    console.error('[upload-storage] missing uploaded object', {
      label,
      key: normalizedKey,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error(`${label} was not found in Bunny Storage. Please upload it again before saving.`);
  }
}
