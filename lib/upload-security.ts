type UploadPurpose = 'video' | 'poster' | 'subtitle';

type UploadPolicy = {
  contentTypes: string[];
  extensions: string[];
  maxBytes: number;
};

const UPLOAD_POLICIES: Record<UploadPurpose, UploadPolicy> = {
  video: {
    contentTypes: ['video/mp4', 'video/webm'],
    extensions: ['.mp4', '.webm'],
    maxBytes: 8 * 1024 * 1024 * 1024
  },
  poster: {
    contentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: 10 * 1024 * 1024
  },
  subtitle: {
    contentTypes: ['text/vtt', 'text/plain', 'application/octet-stream'],
    extensions: ['.vtt'],
    maxBytes: 5 * 1024 * 1024
  }
};

export function sanitizeUploadFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function isUploadPurpose(value: string | undefined): value is UploadPurpose {
  return value === 'video' || value === 'poster' || value === 'subtitle';
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
  return `uploads/${userId}/${purpose}/${assetId}-${sanitizeUploadFilename(filename)}`;
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
          ? 'Upload MP4 or WebM video files.'
          : purpose === 'poster'
            ? 'Upload JPG, PNG, or WEBP poster images.'
            : 'Upload WebVTT subtitle files.'
    };
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > policy.maxBytes) {
    const maxMb = Math.round(policy.maxBytes / (1024 * 1024));
    return {
      ok: false as const,
      error: `That ${purpose} file is too large. Keep it under ${maxMb} MB.`
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

  return key.startsWith(`${basePrefix}${purpose}/`) || key.startsWith(basePrefix);
}
