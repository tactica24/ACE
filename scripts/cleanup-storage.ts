import { PrismaClient } from '@prisma/client';
import { cleanupExpiredOfflinePackages } from '../lib/offline-retention';

const prisma = new PrismaClient();

async function cleanupStreamSessions() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const result = await prisma.streamSession.deleteMany({
    where: {
      lastSeenAt: {
        lt: sevenDaysAgo
      }
    }
  });
  return result.count;
}

async function cleanupRateLimitBuckets() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const result = await prisma.rateLimitBucket.deleteMany({
    where: {
      resetAt: {
        lt: oneHourAgo
      }
    }
  });
  return result.count;
}

async function cleanupOldWatchHistory() {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const result = await prisma.watchHistory.deleteMany({
    where: {
      updatedAt: {
        lt: ninetyDaysAgo
      },
      completedAt: {
        not: null
      }
    }
  });
  return result.count;
}

export async function main() {
  console.log('Starting ACE storage cleanup...');

  const [offlinePackages, streamSessions, rateLimitBuckets, watchHistory] = await Promise.all([
    cleanupExpiredOfflinePackages({ limit: 500 }),
    cleanupStreamSessions(),
    cleanupRateLimitBuckets(),
    cleanupOldWatchHistory()
  ]);

  console.log('Cleanup summary');
  console.log(`Offline packages deleted: ${offlinePackages.deleted}`);
  console.log(`Offline packages scanned: ${offlinePackages.scanned}`);
  console.log(`Offline package retention days: ${offlinePackages.retentionDays}`);
  console.log(`Revoked package retention days: ${offlinePackages.revokedRetentionDays}`);
  console.log(`Stream sessions deleted: ${streamSessions}`);
  console.log(`Rate-limit buckets deleted: ${rateLimitBuckets}`);
  console.log(`Watch history rows deleted: ${watchHistory}`);
}

void main()
  .catch((error) => {
    console.error('Storage cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
