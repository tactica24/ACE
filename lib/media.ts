function encodePathSegment(segment: string) {
  return encodeURIComponent(segment);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const STORAGE_KEY_MARKERS = [
  'uploads/',
  'movies/',
  'streams/',
  'posters/',
  'trailers/',
  'subtitles/',
  'downloads/',
  'creator-kyc/',
  'contract-signatures/'
];

function stripKnownRoutePrefixes(path: string) {
  if (path.startsWith('api/media/')) {
    return path.slice('api/media/'.length);
  }

  return path;
}

function extractStoredObjectKey(path: string) {
  const withoutRoute = stripKnownRoutePrefixes(path);
  const markerIndex = STORAGE_KEY_MARKERS
    .map((marker) => withoutRoute.indexOf(marker))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  return typeof markerIndex === 'number' ? withoutRoute.slice(markerIndex) : withoutRoute;
}

export function normalizeMediaKey(key?: string | null) {
  const trimmed = key?.trim();
  if (!trimmed) return null;

  const withoutOrigin = /^https?:\/\//i.test(trimmed)
    ? (() => {
        try {
          return new URL(trimmed).pathname;
        } catch {
          return trimmed;
        }
      })()
    : trimmed;

  const normalizedPath = safeDecode(withoutOrigin)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');

  return extractStoredObjectKey(normalizedPath) || null;
}

export function getMediaAssetUrl(key?: string | null) {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) return null;

  if (normalizedKey.startsWith('http://') || normalizedKey.startsWith('https://')) {
    return normalizedKey;
  }

  if (key?.trim().startsWith('/')) {
    return key.trim();
  }

  return `/api/media/${normalizedKey.split('/').map(encodePathSegment).join('/')}`;
}
