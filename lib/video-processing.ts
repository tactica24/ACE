export const PROCESSING_STATUSES = [
  'NO_MASTER',
  'MASTER_UPLOADED',
  'ENCODING_STARTED',
  'ENCODING_COMPLETED',
  'READY_TO_STREAM'
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export function getMasterDownloadFileName(fileName: string | null | undefined, fallback: string) {
  return (fileName || `${fallback || 'master'}.mp4`).replace(/[^\w.\- ]+/g, '_');
}

function powerShellLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildFfmpegCommand(movieId: string, fileName: string) {
  const safeInput = getMasterDownloadFileName(fileName, 'downloaded-master');
  const outputName = `${movieId}-playable.mp4`;

  return [
    `$inputFile = Get-Item -LiteralPath ${powerShellLiteral(`./${safeInput}`)} -ErrorAction SilentlyContinue;`,
    `if (-not $inputFile) { $inputFile = Get-ChildItem -File | Where-Object { $_.Extension -eq '.mp4' } | Sort-Object LastWriteTime -Descending | Select-Object -First 1; }`,
    `if (-not $inputFile) { throw 'MP4 master file not found in this folder. Download the master into this folder and run the command again.'; }`,
    '& ffmpeg',
    '-y',
    '-i $inputFile.FullName',
    '-map 0:v:0 -map 0:a:0?',
    '-c:v libx264 -preset veryfast -crf 20',
    '-c:a aac -b:a 160k -ar 48000',
    '-movflags +faststart',
    powerShellLiteral(outputName)
  ].join(' ');
}
