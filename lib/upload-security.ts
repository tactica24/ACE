import {
  MAX_MASTER_BYTES,
  MAX_POSTER_BYTES,
  MAX_SUBTITLE_BYTES,
  MAX_TRAILER_BYTES,
  MAX_VIDEO_BYTES,
  formatUploadLimit
} from './upload-limits';

type UploadPurpose = 'video' | 'trailer' | 'poster' | 'subtitle' | 'master';

type UploadPolicy = {
  contentTypes: string[];
  extensions: string[];
  maxBytes: number;
};

const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
  video: {
    contentTypes: ['video/mp4', 'application/octet-stream'],
    extensions: ['.mp4'],
    maxBytes: MAX_VIDEO_BYTES
  },
  master: {
    contentTypes: ['video/mp4', 'application/octet-stream'],
    extensions: ['.mp4'],
    maxBytes: MAX_MASTER_BYTES
  },
  trailer: {
    contentTypes: ['video/mp4', 'application/octet-stream'],
    extensions: ['.mp4'],
    maxBytes: MAX_TRAILER_BYTES
  },
  poster: {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: MAX_POSTER_BYTES
  },
  subtitle: {
    contentTypes: ['text/vtt', 'text/plain', 'application/octet-stream', 'application/x-subrip'],
    extensions: ['.vtt', '.srt'],
    maxBytes: MAX_SUBTITLE_BYTES
  }
};

export function sanitizeUploadFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function isUploadPurpose(value: string | undefined): value is UploadPurpose {
  return (
    value === 'video' ||
    value === 'trailer' ||
    value === 'poster' ||
    value === 'subtitle' ||
    value === 'master'
  );
}

export function buildOwnedUploadKey({
  userId,
  purpose,
  filename,
  assetId
}: {
  userId: string;
  purpose: UploadPurpose;
  filename: string;
  assetId: string;
}) {
  const storagePurpose = purpose === 'master' ? 'movie' : purpose;
  return `uploads/${userId}/${storagePurpose}/${assetId}-${sanitizeUploadFilename(filename)}`;
}

export function validateUploadRequest({
  purpose,
  filename,
  contentType,
  fileSize
}: {
  purpose: UploadPurpose;
  filename: string;
  contentType: string;
  fileSize: number;
}) {
  const policy = UPLOAD_POLICIES[purpose];
  const lowerName = filename.toLowerCase();
  const normalizedType = contentType.toLowerCase();
  const hasAllowedExtension = policy.extensions.some((extension) => lowerName.endsWith(extension));
  const hasAllowedType = policy.contentTypes.includes(normalizedType);

  if (!filename || !contentType || !hasAllowedExtension || !hasAllowedType) {
    return {
      ok: false as const,
      error:
        purpose === 'video'
          ? 'Upload MP4 video files.'
          : purpose === 'master'
            ? 'Upload a final playable MP4 master.'
            : purpose === 'trailer'
              ? 'Upload MP4 trailer files.'
              : purpose === 'poster'
                ? 'Upload JPG, PNG, or WEBP poster images.'
                : 'Upload WebVTT subtitle files.'
    };
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > policy.maxBytes) {
    return {
      ok: false as const,
      error: `That ${purpose} file is too large. Keep it under ${formatUploadLimit(policy.maxBytes)}.`
    };
  }

  return { ok: true as const };
}

export function isOwnedUploadKey(key: string, userId: string, purpose?: UploadPurpose) {
  if (!key || !userId) {
    return false;
  }

  const basePrefix = `uploads/${userId}/`;
  if (!key.startsWith(basePrefix)) {
    return false;
  }

  if (!purpose) {
    return true;
  }

  if (purpose === 'master') {
    return key.startsWith(`${basePrefix}movie/`) || key.startsWith(`${basePrefix}master/`);
  }

  return key.startsWith(`${basePrefix}${purpose}/`);
}
