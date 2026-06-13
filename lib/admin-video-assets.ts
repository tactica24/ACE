type AdminPosterAssetVideo = {
  id: string;
  posterKey?: string | null;
  series?: {
    posterKey?: string | null;
  } | null;
};

type AdminTrailerAssetVideo = {
  id: string;
  technicalMetadata?: {
    trailerKey?: string | null;
    trailerStreamVideoId?: string | null;
  } | null;
};

export function getAdminPosterAssetHref(video: AdminPosterAssetVideo | null | undefined) {
  if (!video) return null;
  if (!video.posterKey?.trim() && !video.series?.posterKey?.trim()) return null;
  return `/api/admin/videos/${video.id}/poster`;
}

export function getAdminTrailerAssetHref(video: AdminTrailerAssetVideo | null | undefined) {
  if (!video) return null;
  if (!video.technicalMetadata?.trailerKey?.trim() && !video.technicalMetadata?.trailerStreamVideoId?.trim()) return null;
  return `/api/admin/videos/${video.id}/trailer`;
}
