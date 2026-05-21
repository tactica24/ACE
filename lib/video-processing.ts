import { env } from './env';

export const HLS_PUBLIC_BASE_URL = 'https://stream.acestudio.ng';

export const PROCESSING_STATUSES = [
  'NO_MASTER',
  'MASTER_UPLOADED',
  'ENCODING_STARTED',
  'ENCODING_COMPLETED',
  'HLS_UPLOADED',
  'READY_TO_STREAM'
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export function getMp4PlaybackUrl(movieId: string) {
  const cdnBaseUrl = env.ACE_CDN_BASE_URL?.trim() || HLS_PUBLIC_BASE_URL;
  return `${cdnBaseUrl.replace(/\/+$/, '')}/movies/${movieId}/master.mp4`;
}

export function getPlaybackUrl(movieId: string, preferHls = true) {
  const cdnBaseUrl = env.ACE_CDN_BASE_URL?.trim() || HLS_PUBLIC_BASE_URL;
  const base = cdnBaseUrl.replace(/\/+$/, '');
  return preferHls
    ? `${base}/movies/${movieId}/master.m3u8`
    : `${base}/movies/${movieId}/master.mp4`;
}

export function getMasterDownloadFileName(fileName: string | null | undefined, fallback: string) {
  return (fileName || `${fallback || 'master'}.mp4`).replace(/[^\w.\- ]+/g, '_');
}

function powerShellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildFfmpegCommand(movieId: string, fileName: string) {
  const safeInput = getMasterDownloadFileName(fileName, 'downloaded-master');
  const outputDir = `hls-${movieId}`;
  const outputDirs = [
    powerShellLiteral(outputDir),
    powerShellLiteral(`${outputDir}/1080p`),
    powerShellLiteral(`${outputDir}/720p`),
    powerShellLiteral(`${outputDir}/480p`)
  ].join(', ');

  return [
    `$inputFile = Get-Item -LiteralPath ${powerShellLiteral(`./${safeInput}`)} -ErrorAction SilentlyContinue;`,
    `if (-not $inputFile) { $inputFile = Get-ChildItem -File | Where-Object { $_.Extension -in '.mp4', '.mov' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1; }`,
    `if (-not $inputFile) { throw 'Master video file not found in this folder. Download the master into this folder and run the command again.'; }`,
    `New-Item -ItemType Directory -Force ${outputDirs} | Out-Null;`,
    '& ffmpeg',
    '-y',
    '-i $inputFile.FullName',
    '-map 0:v:0 -map 0:a:0',
    '-map 0:v:0 -map 0:a:0',
    '-map 0:v:0 -map 0:a:0',
    '-c:v libx264 -preset veryfast -crf 20 -c:a aac -ar 48000',
    "-filter:v:0 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2'",
    "-filter:v:1 'scale=w=1280:h=720:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2'",
    "-filter:v:2 'scale=w=854:h=480:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2'",
    '-b:v:0 6000k -maxrate:v:0 6500k -bufsize:v:0 12000k -b:a:0 192k',
    '-b:v:1 3000k -maxrate:v:1 3300k -bufsize:v:1 6000k -b:a:1 128k',
    '-b:v:2 1200k -maxrate:v:2 1400k -bufsize:v:2 2400k -b:a:2 96k',
    '-f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments',
    `-hls_segment_filename ${powerShellLiteral(`${outputDir}/%v/seg_%05d.ts`)}`,
    '-master_pl_name master.m3u8',
    '-var_stream_map "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p"',
    powerShellLiteral(`${outputDir}/%v/index.m3u8`)
  ].join(' ');
}
