export function labelize(value?: string) {
  return value
    ? value
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Not set';
}

export function normalizeProcessingStatusLabel(value?: string | null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'Awaiting source';

  const labels: Record<string, string> = {
    NO_MASTER: 'Source missing',
    MASTER_UPLOADED: 'Source attached',
    STREAM_UPLOAD_CREATED: 'Queued for Bunny Stream import',
    STREAM_UPLOAD_UPLOADING: 'Uploading to Bunny Stream',
    ENCODING_STARTED: 'Bunny Stream is processing',
    READY_TO_STREAM: 'Bunny Stream playback ready',
    TRANSCODE_FAILED: 'Bunny Stream needs attention',
  };

  return labels[normalized] ?? labelize(normalized);
}

export type BunnyPlaybackFields = {
  bunnyStreamReadyAt?: string | null;
  processingStatus?: string | null;
  hlsManifestReady?: boolean;
  bunnyStreamError?: string | null;
  bunnyStreamVideoId?: string | null;
};

export function hasReadyBunnyPlayback(video: BunnyPlaybackFields) {
  return Boolean(
    video.bunnyStreamReadyAt || video.processingStatus === 'READY_TO_STREAM' || video.hlsManifestReady,
  );
}

export function hasFailedBunnyPlayback(video: BunnyPlaybackFields) {
  return Boolean(video.processingStatus === 'TRANSCODE_FAILED' || video.bunnyStreamError);
}

export function isBunnyPlaybackInProgress(video: BunnyPlaybackFields) {
  return Boolean(video.bunnyStreamVideoId && !hasReadyBunnyPlayback(video) && !hasFailedBunnyPlayback(video));
}
