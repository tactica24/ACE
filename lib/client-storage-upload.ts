import type { CompletedMultipartUploadPart, PreparedStorageUpload } from './storage-upload';

type ProgressHandler = (loaded: number, total: number) => void;
type UploadPreparedStorageAssetOptions = {
  completeHeaders?: HeadersInit;
};

async function uploadBlobWithXhr(
  url: string,
  blob: Blob,
  contentType: string,
  onProgress: ProgressHandler
) {
  return new Promise<{ etag: string | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded, event.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          etag: xhr.getResponseHeader('ETag')
        });
      } else {
        reject(
          new Error(
            `Storage upload failed with status ${xhr.status}${xhr.responseText ? `: ${xhr.responseText}` : ''}`
          )
        );
      }
    };
    xhr.onerror = () => reject(new Error('Storage upload failed due to a network error.'));
    xhr.ontimeout = () => reject(new Error('Storage upload timed out before Bunny Storage accepted the file.'));
    xhr.onabort = () => reject(new Error('Storage upload was cancelled before it completed.'));
    xhr.send(blob);
  });
}

export async function uploadPreparedStorageAsset(
  upload: PreparedStorageUpload,
  file: File,
  onProgress: ProgressHandler,
  options: UploadPreparedStorageAssetOptions = {}
) {
  if (upload.strategy === 'single') {
    await uploadBlobWithXhr(upload.url, file, upload.contentType || file.type || 'application/octet-stream', onProgress);
    return upload.key;
  }

  const total = file.size;
  const uploadedParts: CompletedMultipartUploadPart[] = [];
  let uploadedBytes = 0;

  for (const part of upload.urls) {
    const start = (part.partNumber - 1) * upload.partSize;
    const end = Math.min(file.size, start + upload.partSize);
    const chunk = file.slice(start, end);

    const { etag } = await uploadBlobWithXhr(
      part.url,
      chunk,
      upload.contentType || file.type || 'application/octet-stream',
      (loaded) => {
        onProgress(uploadedBytes + loaded, total);
      }
    );

    uploadedBytes += chunk.size;
    onProgress(uploadedBytes, total);

    uploadedParts.push({
      partNumber: part.partNumber,
      etag: etag?.trim() || ''
    });
  }

  const response = await fetch('/api/uploads/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.completeHeaders ?? {})
    },
    body: JSON.stringify({
      key: upload.key,
      uploadId: upload.uploadId,
      parts: uploadedParts
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to finalize multipart upload.');
  }

  return upload.key;
}
