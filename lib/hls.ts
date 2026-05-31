import { createSignedStorageUrl, getObjectBuffer, headObject } from './bunny-storage';
import { normalizeMediaKey } from './media';

type HlsCapableVideo = {
  technicalMetadata?: {
    hlsManifestKey?: string | null;
    hlsOutputPath?: string | null;
    hlsReadyAt?: Date | string | null;
  } | null;
};

function trimSlashes(value: string) {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function normalizeHlsOutputPath(value?: string | null) {
  const normalized = normalizeMediaKey(value);
  if (!normalized) return null;
  return trimSlashes(normalized);
}

export function getDefaultHlsOutputPath(videoId: string) {
  return `streams/${videoId}/hls`;
}

export function getHlsManifestKeyFromOutputPath(outputPath?: string | null) {
  const normalized = normalizeHlsOutputPath(outputPath);
  if (!normalized) return null;
  return `${normalized}/index.m3u8`;
}

export function resolveVideoHlsManifestKey(video: HlsCapableVideo) {
  return (
    normalizeMediaKey(video.technicalMetadata?.hlsManifestKey) ??
    getHlsManifestKeyFromOutputPath(video.technicalMetadata?.hlsOutputPath)
  );
}

export function hasReadyVideoHls(video: HlsCapableVideo) {
  return Boolean(resolveVideoHlsManifestKey(video) && video.technicalMetadata?.hlsReadyAt);
}

export function createSignedHlsManifestUrl(manifestKey: string, expiresIn = 60 * 60) {
  return createSignedStorageUrl(manifestKey, {
    expiresIn,
    directoryToken: true,
    pathStyleToken: true
  });
}

function resolveRelativeHlsAssetKey(manifestKey: string, relativePath: string) {
  const cleanRelativePath = relativePath.trim().replace(/^\.\/+/, '');
  if (!cleanRelativePath) return null;
  const baseParts = manifestKey.split('/').slice(0, -1);
  const relativeParts = cleanRelativePath.split('/');
  for (const part of relativeParts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      baseParts.pop();
      continue;
    }
    baseParts.push(part);
  }
  return normalizeMediaKey(baseParts.join('/'));
}

export async function verifyHlsManifest(manifestKey: string) {
  const normalizedManifestKey = normalizeMediaKey(manifestKey);
  if (!normalizedManifestKey) {
    throw new Error('HLS manifest key is required.');
  }

  await headObject(normalizedManifestKey);
  const { buffer } = await getObjectBuffer(normalizedManifestKey);
  const manifestText = buffer.toString('utf8');

  if (!manifestText.includes('#EXTM3U')) {
    throw new Error(`HLS manifest is invalid: ${normalizedManifestKey}`);
  }

  const assetLine = manifestText
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'));

  const firstAssetKey = assetLine ? resolveRelativeHlsAssetKey(normalizedManifestKey, assetLine) : null;
  if (firstAssetKey) {
    await headObject(firstAssetKey);
  }

  return {
    manifestKey: normalizedManifestKey,
    firstAssetKey
  };
}
