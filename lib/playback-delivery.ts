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

export function getPlayableProgressiveKeyCandidates(video: PlaybackDeliveryVideo) {
  const metadata = video.technicalMetadata ?? null;
  const candidates = [video.r2Key, video.fallbackR2Key, metadata?.masterKey]
    .map((value) => normalizeMediaKey(clean(value)))
    .filter((value): value is string => Boolean(value && isProgressiveKey(value)));

  return Array.from(new Set(candidates));
}

export function getPlayableProgressiveKey(video: PlaybackDeliveryVideo) {
  return getPlayableProgressiveKeyCandidates(video)[0] ?? null;
}

export function getPlayableProgressiveUrl(video: PlaybackDeliveryVideo) {
  const playbackUrl = clean(video.technicalMetadata?.playbackUrl);
  return isProgressiveUrl(playbackUrl) ? playbackUrl : null;
}

export function hasPlayableProgressive(video: PlaybackDeliveryVideo) {
  return Boolean(getPlayableProgressiveKey(video) || getPlayableProgressiveUrl(video));
}
