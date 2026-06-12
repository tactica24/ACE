import { hasMovieMp4 } from './movie-assets';
import { hasReadyBunnyMovieStream } from './bunny-stream';
import { hasReadyVideoHls } from './hls';
import { hasVideoMasterSource } from './master-source';

type ReleaseLifecycleVideo = {
  status: string;
  primaryStorageKey?: string | null;
  fallbackStorageKey?: string | null;
  technicalMetadata?: {
    masterKey?: string | null;
    masterSourceUrl?: string | null;
    processingStatus?: string | null;
    bunnyStreamVideoId?: string | null;
    bunnyStreamReadyAt?: Date | string | null;
    hlsManifestKey?: string | null;
    hlsReadyAt?: Date | string | null;
  } | null;
};

const ACTIVE_PIPELINE_STATUSES = new Set(['ENCODING_STARTED', 'STREAM_UPLOAD_CREATED', 'STREAM_UPLOAD_UPLOADING']);
export const VIEWER_VISIBLE_STATUSES = ['PUBLISHED'] as const;

export function isViewerVisibleStatus(status: string | null | undefined) {
  return VIEWER_VISIBLE_STATUSES.includes((status ?? '') as (typeof VIEWER_VISIBLE_STATUSES)[number]);
}

export function getStatusAfterApproval(video: ReleaseLifecycleVideo) {
  if (video.status === 'PUBLISHED') {
    return 'PUBLISHED' as const;
  }

  if (hasReadyBunnyMovieStream(video) || hasReadyVideoHls(video) || hasMovieMp4(video)) {
    return 'READY' as const;
  }

  if (
    video.status === 'PROCESSING' ||
    ACTIVE_PIPELINE_STATUSES.has(video.technicalMetadata?.processingStatus ?? '')
  ) {
    return 'PROCESSING' as const;
  }

  if (video.status === 'MASTER_UPLOADED' || hasVideoMasterSource(video)) {
    return 'MASTER_UPLOADED' as const;
  }

  return 'PENDING' as const;
}
