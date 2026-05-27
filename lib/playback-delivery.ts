import { normalizeMediaKey } from './media';

type PlaybackDeliveryVideo = {
  r2Key?: string | null;
  fallbackR2Key?: string | null;
  technicalMetadata?: {
    playbackUrl?: string | null;
    masterKey?: string | null;
    processingStatus?: string | null;
  } | null;
};

function clean(value?: string | null) {
  return value?.trim() || null;
}

function isHttpUrl(value?: string | null) {
  return /^https?:\/\//i.test(clean(value) ?? '');
}

function hasMp4Extension(value?: string | null) {
  return /\.mp4(?:[?#]|$)/i.test(clean(value) ?? '');
}

function isProgressiveUrl(value?: string | null) {
  const cleaned = clean(value);
  return Boolean(cleaned && isHttpUrl(cleaned) && hasMp4Extension(cleaned));
}

function isProgressiveKey(value?: string | null) {
  const cleaned = clean(value);
  return Boolean(cleaned && hasMp4Extension(cleaned));
}

export function getPlayableProgressiveKey(video: PlaybackDeliveryVideo) {
  const metadata = video.technicalMetadata ?? null;
  const rawKey =
    [video.r2Key, video.fallbackR2Key, metadata?.masterKey, metadata?.playbackUrl]
      .map((value) => clean(value))
      .find((value) => isProgressiveKey(value));
  return normalizeMediaKey(rawKey);
}

export function getPlayableProgressiveUrl(video: PlaybackDeliveryVideo) {
  const playbackUrl = clean(video.technicalMetadata?.playbackUrl);
  return isProgressiveUrl(playbackUrl) ? playbackUrl : null;
}

export function hasPlayableProgressive(video: PlaybackDeliveryVideo) {
  return Boolean(getPlayableProgressiveKey(video) || getPlayableProgressiveUrl(video));
}
