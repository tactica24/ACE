export type MultipartUploadAction = 'initiate' | 'part' | 'complete' | 'abort';

const MULTIPART_UPLOAD_WINDOW_MS = 1000 * 60 * 10;

const MULTIPART_UPLOAD_LIMITS: Record<MultipartUploadAction, number> = {
  initiate: 40,
  part: 5000,
  complete: 500,
  abort: 500
};

export function getMultipartUploadRateLimit(action: MultipartUploadAction, identity: string) {
  return {
    key: `studio-multipart-upload:${action}:${identity}`,
    limit: MULTIPART_UPLOAD_LIMITS[action],
    windowMs: MULTIPART_UPLOAD_WINDOW_MS
  };
}
