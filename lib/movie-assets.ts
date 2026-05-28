import { normalizeMediaKey } from './media';

export type MovieAssetVideo = {
  id: string;
  r2Key?: string | null;
  fallbackR2Key?: string | null;
  posterKey?: string | null;
  technicalMetadata?: {
    masterKey?: string | null;
  } | null;
};

const BLOCKED_POSTER_MARKERS = ['placeholder', 'default-poster', 'ace-studio', 'ace_studio'];

function hasExtension(value: string, extensions: string[]) {
  const lower = value.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function unique(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

export function resolveMovieMp4Candidates(video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>) {
  return unique([
    normalizeMediaKey(video.technicalMetadata?.masterKey),
    normalizeMediaKey(video.r2Key),
    normalizeMediaKey(video.fallbackR2Key)
  ]).filter((key) => hasExtension(key, ['.mp4']));
}

export function resolveMovieMp4Key(video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>) {
  return resolveMovieMp4Candidates(video)[0] ?? null;
}

export function hasMovieMp4(video: Pick<MovieAssetVideo, 'r2Key' | 'fallbackR2Key' | 'technicalMetadata'>) {
  return Boolean(resolveMovieMp4Key(video));
}

export function resolveMoviePosterKey(video: Pick<MovieAssetVideo, 'posterKey'>) {
  const key = normalizeMediaKey(video.posterKey);
  if (!key) return null;
  const lower = key.toLowerCase();
  if (BLOCKED_POSTER_MARKERS.some((marker) => lower.includes(marker))) return null;
  return hasExtension(lower, ['.jpg', '.jpeg', '.png', '.webp']) ? key : null;
}

export function resolveMoviePosterKeyFromCandidates(
  ...videos: Array<Pick<MovieAssetVideo, 'posterKey'> | null | undefined>
) {
  for (const video of videos) {
    if (!video) continue;
    const posterKey = resolveMoviePosterKey(video);
    if (posterKey) return posterKey;
  }

  return null;
}

export function getMoviePosterUrl(video: Pick<MovieAssetVideo, 'id' | 'posterKey'>) {
  return resolveMoviePosterKey(video) ? `/api/movies/${encodeURIComponent(video.id)}/poster` : null;
}

export function getMoviePosterUrlFromCandidates(
  video: Pick<MovieAssetVideo, 'id'>,
  ...posterCandidates: Array<Pick<MovieAssetVideo, 'posterKey'> | null | undefined>
) {
  return resolveMoviePosterKeyFromCandidates(...posterCandidates)
    ? `/api/movies/${encodeURIComponent(video.id)}/poster`
    : null;
}

export function hasMoviePoster(video: Pick<MovieAssetVideo, 'posterKey'>) {
  return Boolean(resolveMoviePosterKey(video));
}

export function hasMoviePosterFromCandidates(
  ...posterCandidates: Array<Pick<MovieAssetVideo, 'posterKey'> | null | undefined>
) {
  return Boolean(resolveMoviePosterKeyFromCandidates(...posterCandidates));
}
