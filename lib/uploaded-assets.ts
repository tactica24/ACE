import { getObjectMetadata, hasConfiguredBunnyStorage } from './bunny-storage';
import { assertStorageObjectExistsViaS3, hasConfiguredBunnyStorageS3 } from './bunny-storage-s3';

export async function assertUploadedObjectExists(key: string | null | undefined, label: string) {
  const normalizedKey = key?.trim();
  if (!normalizedKey) return;

  try {
    if (hasConfiguredBunnyStorageS3()) {
      await assertStorageObjectExistsViaS3(normalizedKey);
      return;
    }

    if (!hasConfiguredBunnyStorage()) return;
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
