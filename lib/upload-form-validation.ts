import { formatUploadLimit } from './upload-limits';

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const SUPPORTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateFileSize(file: { size: number }, maxBytes: number, label: string): string | null {
  if (file.size > maxBytes) {
    return `${label} file is too large. Keep it under ${formatUploadLimit(maxBytes)}.`;
  }
  return null;
}

export function isSupportedImageFile(file: { name: string; type: string } | null) {
  if (!file) {
    return true;
  }
  const lowerName = file.name.toLowerCase();
  const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  const hasSupportedMimeType = !file.type || SUPPORTED_IMAGE_MIME_TYPES.includes(file.type);
  return hasSupportedExtension && hasSupportedMimeType;
}
