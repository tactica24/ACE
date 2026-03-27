import fs from 'fs';
import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import { cacheExists, getCachePath, writeCacheFromStream, ensureStorageDirs } from './cache';
import { getObjectStream } from './r2';

export type StreamResult = {
  status: number;
  headers: Record<string, string>;
  stream: Readable;
};

export async function ensureCached(key: string) {
  await ensureStorageDirs();
  if (await cacheExists(key)) return getCachePath(key);
  const object = await getObjectStream(key);
  const body = object.Body as Readable | undefined;
  if (!body) throw new Error('Missing R2 object body');
  return writeCacheFromStream(key, body);
}

function parseRange(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader) return null;
  const match = /bytes=(\d+)-(\d+)?/.exec(rangeHeader);
  if (!match) return null;
  const start = parseInt(match[1] ?? '0', 10);
  const end = match[2] ? parseInt(match[2], 10) : Math.min(start + 1024 * 1024 * 4 - 1, fileSize - 1);
  return { start, end };
}

function getVideoContentType(filePath: string) {
  const normalizedPath = filePath.toLowerCase();
  if (normalizedPath.endsWith('.webm')) return 'video/webm';
  if (normalizedPath.endsWith('.mov')) return 'video/quicktime';
  if (normalizedPath.endsWith('.mkv')) return 'video/x-matroska';
  if (normalizedPath.endsWith('.avi')) return 'video/x-msvideo';
  return 'video/mp4';
}

export async function streamFile(
  filePath: string,
  rangeHeader: string | null,
  maxBytes?: number
): Promise<StreamResult> {
  const stat = await fsPromises.stat(filePath);
  const effectiveSize = maxBytes ? Math.min(maxBytes, stat.size) : stat.size;
  const range = parseRange(rangeHeader, effectiveSize);
  const contentType = getVideoContentType(filePath);

  if (range && range.start >= effectiveSize) {
    return {
      status: 416,
      headers: {
        'Content-Range': `bytes */${effectiveSize}`,
        'Content-Type': contentType
      },
      stream: Readable.from([]) as Readable
    };
  }

  if (!range) {
    return {
      status: 200,
      headers: {
        'Content-Length': effectiveSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      },
      stream: fs.createReadStream(filePath, { start: 0, end: effectiveSize - 1 })
    };
  }

  const chunkSize = range.end - range.start + 1;
  return {
    status: 206,
    headers: {
      'Content-Range': `bytes ${range.start}-${range.end}/${effectiveSize}`,
      'Content-Length': chunkSize.toString(),
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    },
    stream: fs.createReadStream(filePath, { start: range.start, end: range.end })
  };
}


