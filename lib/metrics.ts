import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { env } from './env';
import { getCacheDir } from './cache';

const metrics = {
  cacheHits: 0,
  cacheMisses: 0
};

export function recordCacheHit(hit: boolean) {
  if (hit) metrics.cacheHits += 1;
  else metrics.cacheMisses += 1;
}

export function getCacheHitRate() {
  const total = metrics.cacheHits + metrics.cacheMisses;
  if (total === 0) return 1;
  return metrics.cacheHits / total;
}

export async function getDiskFreeGb() {
  try {
    const stat = await fs.statfs(path.resolve(getCacheDir()));
    const freeBytes = stat.bavail * stat.bsize;
    return freeBytes / 1024 / 1024 / 1024;
  } catch {
    return 0;
  }
}

export async function getNodeHealth() {
  const cpuLoad = os.loadavg()[0] / os.cpus().length;
  const memoryUsed = (os.totalmem() - os.freemem()) / os.totalmem();
  const diskFreeGb = await getDiskFreeGb();

  return {
    nodeName: env.ACE_NODE_NAME,
    region: env.ACE_NODE_REGION,
    cpuLoad,
    memoryUsed,
    diskFreeGb,
    cacheHitRate: getCacheHitRate()
  };
}
