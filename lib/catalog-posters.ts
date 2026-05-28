import { hasMoviePosterFromCandidates } from './movie-assets';

export type PosterBackedVideo = {
  posterKey?: string | null;
  series?: {
    posterKey?: string | null;
  } | null;
};

export function hasCatalogPoster(video: PosterBackedVideo) {
  return hasMoviePosterFromCandidates(video, video.series);
}

export function onlyCatalogVideosWithPosters<T extends PosterBackedVideo>(videos: T[]) {
  return videos.filter(hasCatalogPoster);
}
