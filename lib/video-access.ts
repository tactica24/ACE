import { type AuthTokenPayload } from './auth';

type AccessVideo = {
  creatorId: string;
  status: string;
  videoType: string;
  seriesId?: string | null;
  r2Key?: string | null;
  fallbackR2Key?: string | null;
};

export function canPreviewVideo(video: AccessVideo, auth: Pick<AuthTokenPayload, 'role' | 'sub'> | null | undefined) {
  return Boolean(auth && (auth.role === 'ADMIN' || auth.sub === video.creatorId));
}

export function canAccessVideo(video: AccessVideo, auth: Pick<AuthTokenPayload, 'role' | 'sub'> | null | undefined) {
  return video.status === 'APPROVED' || video.status === 'PUBLISHED' || canPreviewVideo(video, auth);
}

export function isSeriesContainer(video: Pick<AccessVideo, 'videoType' | 'seriesId'>) {
  return video.videoType === 'SERIES' && !video.seriesId;
}

export function isEpisodeVideo(video: Pick<AccessVideo, 'seriesId'>) {
  return Boolean(video.seriesId);
}

export function isPlayableVideo(video: Pick<AccessVideo, 'videoType' | 'seriesId' | 'r2Key' | 'fallbackR2Key'>) {
  return !isSeriesContainer(video) && Boolean(video.r2Key || video.fallbackR2Key);
}
