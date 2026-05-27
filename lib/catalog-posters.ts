import { getMediaAssetUrl } from './media';

export type PosterBackedVideo = {
  posterKey?: string | null;
};

export function hasCatalogPoster(video: PosterBackedVideo) {
  return Boolean(getMediaAssetUrl(video.posterKey));
}

export function onlyCatalogVideosWithPosters<T extends PosterBackedVideo>(videos: T[]) {
  return videos.filter(hasCatalogPoster);
}
