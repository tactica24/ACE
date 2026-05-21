function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

export function getMediaAssetUrl(key?: string | null) {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://') || key.startsWith('/')) {
    return key;
  }

  return `/api/media/${key.split('/').map(encodePathSegment).join('/')}`;
}
