import { normalizeMediaKey } from './media';

type MasterSourceVideo = {
  technicalMetadata?: {
    masterKey?: string | null;
    masterSourceUrl?: string | null;
  } | null;
};

export function normalizeDropboxSourceUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'dropbox.com' && hostname !== 'www.dropbox.com' && hostname !== 'dl.dropboxusercontent.com') {
    return null;
  }

  if (hostname === 'dropbox.com') {
    url.hostname = 'www.dropbox.com';
  }

  if (url.hostname === 'www.dropbox.com') {
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }

  return url.toString();
}

export function getVideoMasterKey(video: MasterSourceVideo) {
  return normalizeMediaKey(video.technicalMetadata?.masterKey);
}

export function getVideoMasterSourceUrl(video: MasterSourceVideo) {
  const trimmed = video.technicalMetadata?.masterSourceUrl?.trim();
  return trimmed || null;
}

export function hasVideoMasterSource(video: MasterSourceVideo) {
  return Boolean(getVideoMasterKey(video) || getVideoMasterSourceUrl(video));
}

export function getVideoMasterSourceType(video: MasterSourceVideo) {
  if (getVideoMasterSourceUrl(video)) return 'dropbox';
  if (getVideoMasterKey(video)) return 'bunny';
  return 'missing';
}
