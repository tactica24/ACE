export const MULTIPART_UPLOAD_THRESHOLD_BYTES = 64 * 1024 * 1024;
export const MULTIPART_UPLOAD_PART_SIZE_BYTES = 64 * 1024 * 1024;

export type PreparedStorageUploadSingle = {
  strategy: 'single';
  key: string;
  contentType: string;
  url: string;
  fallbackUrl?: string;
};

export type PreparedStorageUploadMultipart = {
  strategy: 'multipart';
  key: string;
  contentType: string;
  uploadId: string;
  partSize: number;
  urls: Array<{
    partNumber: number;
    url: string;
  }>;
  fallbackUrl?: string;
};

export type PreparedStorageUpload =
  | PreparedStorageUploadSingle
  | PreparedStorageUploadMultipart;

export type CompletedMultipartUploadPart = {
  partNumber: number;
  etag: string;
};
