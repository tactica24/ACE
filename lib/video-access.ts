import { type AuthTokenPayload } from './auth';
import { hasReadyMoviePlayback } from './movie-assets';

type AccessVideo = {
  creatorId: string;
  status: string;
  videoType: string;
  seriesId?: string | null;
  primaryStorageKey?: string | null;
  fallbackStorageKey?: string | null;
  technicalMetadata?: {
    masterKey?: string | null;
    hlsManifestKey?: string | null;
    hlsOutputPath?: string | null;
    hlsReadyAt?: Date | string | null;
  } | null;
};

export function canPreviewVideo(video: Pick<AccessVideo, 'creatorId'>, auth: Pick<AuthTokenPayload, 'role' | 'sub'> | null | undefined) {
  return Boolean(auth && (auth.role === 'ADMIN' || auth.sub === video.creatorId));
}

export function canAccessVideo(video: Pick<AccessVideo, 'creatorId' | 'status'>, auth: Pick<AuthTokenPayload, 'role' | 'sub'> | null | undefined) {
  return video.status === 'APPROVED' || video.status === 'PUBLISHED' || canPreviewVideo(video, auth);
}

export function isSeriesContainer(video: Pick<AccessVideo, 'videoType' | 'seriesId'>) {
  return video.videoType === 'SERIES' && !video.seriesId;
}

export function isEpisodeVideo(video: Pick<AccessVideo, 'seriesId'>) {
  return Boolean(video.seriesId);
}

export function isPlayableVideo(video: Pick<AccessVideo, 'videoType' | 'seriesId' | 'primaryStorageKey' | 'fallbackStorageKey' | 'technicalMetadata'>) {
  return !isSeriesContainer(video) && hasReadyMoviePlayback(video);
}
