import { env } from './env';

function getEncodedHlsPath(videoId: string, assetPath = 'master.m3u8') {
  return `/movies/${encodeURIComponent(videoId)}/${assetPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`;
}

export function getSignedHlsDeliveryUrl(videoId: string, token: string, assetPath = 'master.m3u8') {
  const query = `token=${encodeURIComponent(token)}`;
  const cdnBaseUrl = env.ACE_CDN_BASE_URL?.trim();

  if (cdnBaseUrl) {
    return `${cdnBaseUrl.replace(/\/+$/, '')}${getEncodedHlsPath(videoId, assetPath)}?${query}`;
  }

  return `/api/hls/${encodeURIComponent(videoId)}/${assetPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}?${query}`;
}

export function getSignedStoredHlsUrl(videoId: string, token: string, storedHlsUrl?: string | null, assetPath = 'master.m3u8') {
  const trimmedUrl = storedHlsUrl?.trim();
  if (!trimmedUrl || !/^https?:\/\//i.test(trimmedUrl)) {
    return getSignedHlsDeliveryUrl(videoId, token, assetPath);
  }

  const parsed = new URL(trimmedUrl);
  const pathParts = parsed.pathname.split('/').filter(Boolean);
  pathParts[pathParts.length - 1] = assetPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  parsed.pathname = `/${pathParts.join('/')}`;
  parsed.search = '';
  parsed.searchParams.set('token', token);
  return parsed.toString();
}

export function getSignedStoredMediaUrl(token: string, storedUrl: string) {
  const parsed = new URL(storedUrl);
  parsed.searchParams.set('token', token);
  return parsed.toString();
}
