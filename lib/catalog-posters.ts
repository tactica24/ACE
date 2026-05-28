import { hasMoviePoster } from './movie-assets';

export type PosterBackedVideo = {
  posterKey?: string | null;
};

export function hasCatalogPoster(video: PosterBackedVideo) {
  return hasMoviePoster(video);
}

export function onlyCatalogVideosWithPosters<T extends PosterBackedVideo>(videos: T[]) {
  return videos.filter(hasCatalogPoster);
}
