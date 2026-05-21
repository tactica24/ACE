export function getHlsMasterKey(videoId: string) {
  return `movies/${videoId}/master.m3u8`;
}

export function getHlsAssetKey(videoId: string, assetPath: string) {
  return `movies/${videoId}/${assetPath}`;
}

export function getHlsContentType(assetPath: string) {
  if (assetPath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (assetPath.endsWith('.m4s') || assetPath.endsWith('.mp4')) return 'video/mp4';
  if (assetPath.endsWith('.ts')) return 'video/mp2t';
  if (assetPath.endsWith('.vtt')) return 'text/vtt';
  return 'application/octet-stream';
}

export function trimPlaylistToTeaser(playlist: string, teaserSec: number) {
  if (!playlist.includes('#EXTINF:')) return playlist;

  const lines = playlist.split(/\r?\n/);
  const trimmed: string[] = [];
  let consumedSec = 0;
  let pendingDuration: number | null = null;
  let ended = false;

  for (const line of lines) {
    if (ended) break;

    if (line.startsWith('#EXTINF:')) {
      const rawDuration = line.slice('#EXTINF:'.length).split(',')[0];
      pendingDuration = Number(rawDuration);
      if (!Number.isFinite(pendingDuration)) pendingDuration = 0;
      trimmed.push(line);
      continue;
    }

    if (pendingDuration !== null && line && !line.startsWith('#')) {
      consumedSec += pendingDuration;
      trimmed.push(line);
      pendingDuration = null;
      if (consumedSec >= teaserSec) {
        trimmed.push('#EXT-X-ENDLIST');
        ended = true;
      }
      continue;
    }

    if (!line.startsWith('#EXT-X-ENDLIST')) {
      trimmed.push(line);
    }
  }

  if (!trimmed.some((line) => line === '#EXT-X-ENDLIST')) {
    trimmed.push('#EXT-X-ENDLIST');
  }

  return trimmed.join('\n');
}

export function rewriteManifestUris(manifest: string, mapUri: (value: string) => string) {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      if (line.startsWith('#EXT-X-KEY') || line.startsWith('#EXT-X-MAP')) {
        return line.replace(/URI="([^"]+)"/g, (_match, value) => `URI="${mapUri(value)}"`);
      }
      if (line.startsWith('#')) return line;
      if (/^https?:\/\//i.test(line)) return line;
      return mapUri(line);
    })
    .join('\n');
}
