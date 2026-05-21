import fs from 'fs/promises';
import path from 'path';
import { env } from './env';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

function getStorageDir() {
  return env.ACE_STORAGE_DIR;
}

export function getCacheDir() {
  return path.join(getStorageDir(), 'cache');
}

export function getAceDir() {
  return path.join(getStorageDir(), 'ace');
}

export async function ensureStorageDirs() {
  await fs.mkdir(getCacheDir(), { recursive: true });
  await fs.mkdir(getAceDir(), { recursive: true });
}

function assertSafeKey(key: string) {
  if (key.includes('..') || key.startsWith('/') || key.startsWith('\\')) {
    throw new Error('Invalid storage key');
  }
}

export function getCachePath(key: string) {
  assertSafeKey(key);
  return path.join(getCacheDir(), key);
}

export function getAcePath(key: string) {
  assertSafeKey(key);
  return path.join(getAceDir(), key);
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

export async function deleteCachedPrefix(prefix: string) {
  assertSafeKey(prefix);
  await fs.rm(path.join(getCacheDir(), prefix), { recursive: true, force: true });
}

export async function writeCacheFromStream(key: string, stream: Readable) {
  const cachePath = getCachePath(key);
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  const tempPath = `${cachePath}.${process.pid}.${Date.now()}.tmp`;
  const nodeFs = await import('fs');
  const writeStream = nodeFs.createWriteStream(tempPath);

  try {
    await pipeline(stream, writeStream);
    await fs.rename(tempPath, cachePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => null);
    throw error;
  }

  return cachePath;
}
