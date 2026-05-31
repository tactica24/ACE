import { getObjectBuffer } from './bunny-storage';

export type StoredSignatureAsset = {
  key: string;
  buffer: Buffer;
  contentType: string;
  dataUrl: string;
};

export async function getStoredSignatureAsset(key?: string | null): Promise<StoredSignatureAsset | null> {
  const safeKey = key?.trim();
  if (!safeKey) {
    return null;
  }

  try {
    const asset = await getObjectBuffer(safeKey);
    return {
      key: safeKey,
      buffer: asset.buffer,
      contentType: asset.contentType,
      dataUrl: `data:${asset.contentType};base64,${asset.buffer.toString('base64')}`
    };
  } catch {
    return null;
  }
}

export async function getStoredSignatureDataUrl(key?: string | null) {
  const asset = await getStoredSignatureAsset(key);
  return asset?.dataUrl ?? null;
}
