import { Buffer } from 'node:buffer';

export function convertSubtitleToVtt(input: Buffer | Uint8Array): Buffer {
  const text = Buffer.from(input).toString('utf8');
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const trimmed = normalized.trimStart();

  if (trimmed.startsWith('WEBVTT')) {
    return Buffer.from(trimmed, 'utf8');
  }

  const converted = trimmed.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  const header = 'WEBVTT\n\n';
  return Buffer.from(header + converted, 'utf8');
}

export const srtToVtt = convertSubtitleToVtt;

export function ensureVttFilename(filename: string) {
  return filename.replace(/\.[^.]*$/g, '') + '.vtt';
}
