type BunnyTusUpload = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationExpire: string;
  authorizationSignature: string;
};

type ProgressHandler = (loaded: number, total: number) => void;

const BUNNY_TUS_CHUNK_SIZE = 16 * 1024 * 1024;
const BUNNY_TUS_CHUNK_RETRIES = 3;

function toUploadMetadata(filename: string, contentType: string) {
  const encode = (value: string) => window.btoa(unescape(encodeURIComponent(value)));

  return `filename ${encode(filename)},filetype ${encode(contentType || 'application/octet-stream')}`;
}

function sendXhr(request: {
  method: 'POST' | 'PATCH' | 'HEAD';
  url: string;
  headers: Record<string, string>;
  body?: Blob;
  onProgress?: ProgressHandler;
  timeoutMs?: number;
}) {
  return new Promise<XMLHttpRequest>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method, request.url);
    xhr.timeout = request.timeoutMs ?? 0;
    for (const [name, value] of Object.entries(request.headers)) {
      xhr.setRequestHeader(name, value);
    }

    if (request.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          request.onProgress?.(event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr);
      } else {
        reject(new Error(`Bunny Stream upload failed with status ${xhr.status}${xhr.responseText ? `: ${xhr.responseText}` : ''}`));
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          `Bunny Stream upload failed because the browser could not reach ${request.url}. Check CSP connect-src, browser networking, Bunny availability, and cross-origin upload permissions.`
        )
      );
    xhr.ontimeout = () =>
      reject(new Error(`Bunny Stream upload timed out before completion while uploading to ${request.url}.`));
    xhr.onabort = () => reject(new Error('Bunny Stream upload was cancelled.'));
    xhr.send(request.body);
  });
}

async function getTusUploadOffset(uploadUrl: string, headers: Record<string, string>) {
  const response = await sendXhr({
    method: 'HEAD',
    url: uploadUrl,
    headers,
    timeoutMs: 1000 * 30
  });

  const rawOffset = response.getResponseHeader('Upload-Offset');
  const parsedOffset = Number(rawOffset ?? '0');
  return Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
}

export async function uploadFileToBunnyTus(
  upload: BunnyTusUpload,
  file: File,
  onProgress: ProgressHandler
) {
  const commonHeaders = {
    AuthorizationSignature: upload.authorizationSignature,
    AuthorizationExpire: upload.authorizationExpire,
    VideoId: upload.videoId,
    LibraryId: upload.libraryId,
    'Tus-Resumable': '1.0.0'
  };

  const createResponse = await sendXhr({
    method: 'POST',
    url: upload.endpoint,
    headers: {
      ...commonHeaders,
      'Upload-Length': String(file.size),
      'Upload-Metadata': toUploadMetadata(file.name, file.type || 'application/octet-stream')
    },
    timeoutMs: 1000 * 60
  });

  const locationHeader = createResponse.getResponseHeader('Location');
  if (!locationHeader) {
    throw new Error('Bunny Stream did not return an upload location.');
  }

  const uploadUrl = new URL(locationHeader, upload.endpoint).toString();
  let uploadedBytes = await getTusUploadOffset(uploadUrl, commonHeaders);

  onProgress(uploadedBytes, file.size);

  while (uploadedBytes < file.size) {
    const nextChunkEnd = Math.min(uploadedBytes + BUNNY_TUS_CHUNK_SIZE, file.size);
    const chunk = file.slice(uploadedBytes, nextChunkEnd);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < BUNNY_TUS_CHUNK_RETRIES; attempt += 1) {
      try {
        const patchResponse = await sendXhr({
          method: 'PATCH',
          url: uploadUrl,
          headers: {
            ...commonHeaders,
            'Upload-Offset': String(uploadedBytes),
            'Content-Type': 'application/offset+octet-stream'
          },
          body: chunk,
          onProgress: (loaded, total) => {
            onProgress(uploadedBytes + loaded, file.size || total);
          }
        });

        const rawNextOffset = patchResponse.getResponseHeader('Upload-Offset');
        const resolvedOffset = Number(rawNextOffset ?? String(nextChunkEnd));
        uploadedBytes =
          Number.isFinite(resolvedOffset) && resolvedOffset > uploadedBytes ? resolvedOffset : nextChunkEnd;
        onProgress(uploadedBytes, file.size);
        lastError = null;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Bunny Stream upload failed.');
        uploadedBytes = await getTusUploadOffset(uploadUrl, commonHeaders).catch(() => uploadedBytes);

        if (uploadedBytes >= file.size) {
          onProgress(file.size, file.size);
          return;
        }
      }
    }

    if (lastError) {
      throw new Error(
        `${lastError.message} Large movie uploads are now sent in chunks, but this chunk could not be completed after multiple retries.`
      );
    }
  }

  onProgress(file.size, file.size);
}
