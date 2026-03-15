import fs from 'fs/promises';
import path from 'path';
import { env } from './env';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const storageDir = env.ACE_STORAGE_DIR;
export const cacheDir = path.join(storageDir, 'cache');
export const aceDir = path.join(storageDir, 'ace');

export async function ensureStorageDirs() {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.mkdir(aceDir, { recursive: true });
}

function assertSafeKey(key: string) {
  if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
    throw new Error('Invalid storage key');
  }
}

export function getCachePath(key: string) {
  assertSafeKey(key);
  return path.join(cacheDir, key);
}

export function getAcePath(key: string) {
  assertSafeKey(key);
  return path.join(aceDir, key);
}

export async function cacheExists(key: string) {
  const cachePath = getCachePath(key);
  try {
    await fs.access(cachePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeCacheFromStream(key: string, stream: Readable) {
  const cachePath = getCachePath(key);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  const writeStream = (await import('fs')).createWriteStream(cachePath);
  await pipeline(stream, writeStream);
  return cachePath;
}


