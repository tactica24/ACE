type BunnyTusUpload = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationExpire: string;
  authorizationSignature: string;
};

type ProgressHandler = (loaded: number, total: number) => void;

function toUploadMetadata(filename: string, contentType: string) {
  const encode = (value: string) => window.btoa(unescape(encodeURIComponent(value)));

  return `filename ${encode(filename)},filetype ${encode(contentType || 'application/octet-stream')}`;
}

function sendXhr(request: {
  method: 'POST' | 'PATCH';
  url: string;
  headers: Record<string, string>;
  body?: Blob;
  onProgress?: ProgressHandler;
}) {
  return new Promise<XMLHttpRequest>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(request.method, request.url);
    xhr.timeout = 1000 * 60 * 20;
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
    }
  });

  const locationHeader = createResponse.getResponseHeader('Location');
  if (!locationHeader) {
    throw new Error('Bunny Stream did not return an upload location.');
  }

  const uploadUrl = new URL(locationHeader, upload.endpoint).toString();

  await sendXhr({
    method: 'PATCH',
    url: uploadUrl,
    headers: {
      ...commonHeaders,
      'Upload-Offset': '0',
      'Content-Type': 'application/offset+octet-stream'
    },
    body: file,
    onProgress
  });

  onProgress(file.size, file.size);
}
