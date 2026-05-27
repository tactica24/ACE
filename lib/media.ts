function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

export function getMediaAssetUrl(key?: string | null) {
  const normalizedKey = key?.trim().replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/') || null;
  if (!normalizedKey) return null;

  if (normalizedKey.startsWith('http://') || normalizedKey.startsWith('https://')) {
    return normalizedKey;
  }

  if (key?.trim().startsWith('/')) {
    return key.trim();
  }

  return `/api/media/${normalizedKey.split('/').map(encodePathSegment).join('/')}`;
}
