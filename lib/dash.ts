export function getDashManifestKey(videoId: string) {
  return `streams/${videoId}/dash/manifest.mpd`;
}

export function getDashAssetKey(videoId: string, assetPath: string) {
  return `streams/${videoId}/dash/${assetPath}`;
}

export function getDashContentType(assetPath: string) {
  if (assetPath.endsWith('.mpd')) return 'application/dash+xml';
  if (assetPath.endsWith('.m4s')) return 'video/iso.segment';
  if (assetPath.endsWith('.m4a')) return 'audio/mp4';
  if (assetPath.endsWith('.mp4')) return 'video/mp4';
  if (assetPath.endsWith('.vtt')) return 'text/vtt';
  return 'application/octet-stream';
}

function mapRelativeUri(rawValue: string, mapUri: (value: string) => string) {
  const trimmed = rawValue.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('urn:')) {
    return rawValue;
  }

  return mapUri(trimmed);
}

export function rewriteDashManifestUris(manifest: string, mapUri: (value: string) => string) {
  return manifest
    .replace(/<BaseURL>([^<]+)<\/BaseURL>/g, (_match, value: string) => `<BaseURL>${mapRelativeUri(value, mapUri)}</BaseURL>`)
    .replace(/\b(media|initialization|sourceURL|xlink:href)="([^"]+)"/g, (_match, attribute: string, value: string) => {
      return `${attribute}="${mapRelativeUri(value, mapUri)}"`;
    });
}
