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
