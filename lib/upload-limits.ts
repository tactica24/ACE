const GIB = 1024 * 1024 * 1024;

export const MAX_VIDEO_BYTES = 8 * GIB;
export const MAX_MASTER_BYTES = 100 * GIB;
export const MAX_TRAILER_BYTES = 10 * GIB;
export const MAX_POSTER_BYTES = 100 * 1024 * 1024;
export const MAX_SUBTITLE_BYTES = 5 * 1024 * 1024;
export const SINGLE_PUT_SAFE_BYTES = 4.5 * GIB;
export const MULTIPART_CHUNK_BYTES = 64 * 1024 * 1024;

export function formatUploadLimit(bytes: number) {
  if (bytes >= GIB) {
    return `${Math.round(bytes / GIB)} GB`;
  }

  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
