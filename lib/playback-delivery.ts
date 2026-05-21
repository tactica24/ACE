type PlaybackDeliveryVideo = {
  hlsUrl?: string | null;
  r2Key?: string | null;
  fallbackR2Key?: string | null;
  technicalMetadata?: {
    playbackUrl?: string | null;
    hlsPlaybackUrl?: string | null;
    masterKey?: string | null;
    processingStatus?: string | null;
  } | null;
};

function clean(value?: string | null) {
  return value?.trim() || null;
}

function isHlsUrl(value?: string | null) {
  return Boolean(clean(value)?.toLowerCase().includes('.m3u8'));
}

export function getPlayableHlsUrl(video: PlaybackDeliveryVideo) {
  const metadata = video.technicalMetadata ?? null;
  const candidates = [
    clean(video.hlsUrl),
    clean(metadata?.hlsPlaybackUrl),
    clean(metadata?.playbackUrl)
  ];

  return candidates.find((candidate) => isHlsUrl(candidate)) ?? null;
}

export function getPlayableProgressiveKey(video: PlaybackDeliveryVideo) {
  return (
    clean(video.r2Key) ??
    clean(video.fallbackR2Key) ??
    clean(video.technicalMetadata?.masterKey) ??
    null
  );
}

export function hasPlayableHls(video: PlaybackDeliveryVideo) {
  return Boolean(getPlayableHlsUrl(video));
}

export function hasPlayableProgressive(video: PlaybackDeliveryVideo) {
  return Boolean(getPlayableProgressiveKey(video));
}
