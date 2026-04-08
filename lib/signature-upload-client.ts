'use client';

function sanitizeFileStem(filename: string) {
  const stem = filename.replace(/\.[^.]+$/, '').trim() || 'signature';
  return stem.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'signature';
}

function loadImage(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('The signature image could not be opened.'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('The signature image could not be prepared.'));
          return;
        }

        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

function trimWhiteSpace(sourceCanvas: HTMLCanvasElement) {
  const context = sourceCanvas.getContext('2d');
  if (!context) {
    return sourceCanvas;
  }

  const { width, height } = sourceCanvas;
  const { data } = context.getImageData(0, 0, width, height);
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];
      const isInk = alpha > 0 && (red < 245 || green < 245 || blue < 245);

      if (!isInk) {
        continue;
      }

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) {
    return sourceCanvas;
  }

  const padding = 24;
  const cropLeft = Math.max(0, left - padding);
  const cropTop = Math.max(0, top - padding);
  const cropRight = Math.min(width - 1, right + padding);
  const cropBottom = Math.min(height - 1, bottom + padding);
  const cropWidth = cropRight - cropLeft + 1;
  const cropHeight = cropBottom - cropTop + 1;
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  const croppedContext = croppedCanvas.getContext('2d');
  if (!croppedContext) {
    return sourceCanvas;
  }

  croppedContext.fillStyle = '#ffffff';
  croppedContext.fillRect(0, 0, cropWidth, cropHeight);
  croppedContext.drawImage(sourceCanvas, cropLeft, cropTop, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  return croppedCanvas;
}

export async function prepareSignatureUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Upload a signature image file.');
  }

  const image = await loadImage(file);
  const maxWidth = 1400;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('This browser could not prepare the signature image.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const trimmedCanvas = trimWhiteSpace(canvas);
  const blob = await canvasToBlob(trimmedCanvas);
  return {
    blob,
    contentType: 'image/jpeg',
    filename: `${sanitizeFileStem(file.name)}.jpg`,
    previewUrl: URL.createObjectURL(blob)
  };
}

export async function uploadContractSignatureAsset(blob: Blob, filename: string, scope: 'platform' | 'producer') {
  const uploadRes = await fetch('/api/studio/contracts/signature-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scope,
      filename,
      contentType: 'image/jpeg'
    })
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || !uploadData.url || !uploadData.key) {
    throw new Error(uploadData.error ?? 'Unable to prepare the signature upload.');
  }

  const putRes = await fetch(uploadData.url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob
  });

  if (!putRes.ok) {
    throw new Error('Unable to upload the signature image.');
  }

  return {
    key: uploadData.key as string
  };
}
