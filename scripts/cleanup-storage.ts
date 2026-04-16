import { PrismaClient } from '@prisma/client';
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const prisma = new PrismaClient();

// Initialize S3 client (compatible with Cloudflare R2)
const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

interface CleanupStats {
  deletedOfflinePackages: number;
  freedStorageBytes: number;
  expiredSessions: number;
  cleanedRateLimitBuckets: number;
}

async function cleanupOfflinePackages(): Promise<{ deleted: number; freedBytes: number }> {
  console.log('🧹 Cleaning up expired offline packages...');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Find expired packages
  const expiredPackages = await prisma.offlinePackage.findMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
    },
    select: {
      id: true,
      aceFileKey: true,
    },
  });

  let deletedCount = 0;
  let freedBytes = 0;

  for (const pkg of expiredPackages) {
    try {
      // Delete from R2 storage
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET!,
        Key: pkg.aceFileKey,
      }));

      // Delete from database
      await prisma.offlinePackage.delete({
        where: { id: pkg.id },
      });

      deletedCount++;
      console.log(`✅ Deleted expired offline package: ${pkg.id}`);
    } catch (error) {
      console.error(`❌ Failed to delete offline package ${pkg.id}:`, error);
    }
  }

  return { deleted: deletedCount, freedBytes };
}

async function cleanupStreamSessions(): Promise<number> {
  console.log('🧹 Cleaning up expired stream sessions...');
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const result = await prisma.streamSession.deleteMany({
    where: {
      lastSeenAt: {
        lt: sevenDaysAgo,
      },
    },
  });

  console.log(`✅ Cleaned up ${result.count} expired stream sessions`);
  return result.count;
}

async function cleanupRateLimitBuckets(): Promise<number> {
  console.log('🧹 Cleaning up expired rate limit buckets...');
  
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const result = await prisma.rateLimitBucket.deleteMany({
    where: {
      resetAt: {
        lt: oneHourAgo,
      },
    },
  });

  console.log(`✅ Cleaned up ${result.count} expired rate limit buckets`);
  return result.count;
}

async function cleanupOldWatchHistory(): Promise<number> {
  console.log('🧹 Cleaning up old watch history entries...');
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const result = await prisma.watchHistory.deleteMany({
    where: {
      updatedAt: {
        lt: ninetyDaysAgo,
      },
      completedAt: {
        not: null, // Only delete completed entries
      },
    },
  });

  console.log(`✅ Cleaned up ${result.count} old watch history entries`);
  return result.count;
}

async function getStorageUsage(): Promise<{ totalBytes: number; objectCount: number }> {
  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!,
    }));

    let totalBytes = 0;
    let objectCount = 0;

    for (const obj of response.Contents || []) {
      if (obj.Size) {
        totalBytes += obj.Size;
        objectCount++;
      }
    }

    return { totalBytes, objectCount };
  } catch (error) {
    console.error('❌ Failed to get storage usage:', error);
    return { totalBytes: 0, objectCount: 0 };
  }
}

async function generateCleanupReport(stats: CleanupStats, storageBefore: { totalBytes: number; objectCount: number }, storageAfter: { totalBytes: number; objectCount: number }) {
  console.log('\n📊 Cleanup Report');
  console.log('================');
  console.log(`📦 Offline packages deleted: ${stats.deletedOfflinePackages}`);
  console.log(`💾 Storage freed: ${(stats.freedStorageBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎬 Stream sessions cleaned: ${stats.expiredSessions}`);
  console.log(`⚡ Rate limit buckets cleaned: ${stats.cleanedRateLimitBuckets}`);
  console.log(`📈 Storage objects before: ${storageBefore.objectCount}`);
  console.log(`📉 Storage objects after: ${storageAfter.objectCount}`);
  console.log(`💾 Storage before: ${(storageBefore.totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`💾 Storage after: ${(storageAfter.totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`💰 Storage saved: ${((storageBefore.totalBytes - storageAfter.totalBytes) / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

async function main() {
  console.log('🚀 Starting ACE Studio storage cleanup...');
  
  try {
    const storageBefore = await getStorageUsage();
    
    const packageResult = await cleanupOfflinePackages();
    const sessionResult = await cleanupStreamSessions();
    const rateLimitResult = await cleanupRateLimitBuckets();
    const watchHistoryResult = await cleanupOldWatchHistory();
    
    const storageAfter = await getStorageUsage();
    
    const stats: CleanupStats = {
      deletedOfflinePackages: packageResult.deleted,
      freedStorageBytes: packageResult.freedBytes,
      expiredSessions: sessionResult,
      cleanedRateLimitBuckets: rateLimitResult,
    };
    
    await generateCleanupReport(stats, storageBefore, storageAfter);
    
    console.log('\n✅ Storage cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Storage cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  main();
}

export { main as cleanupStorage };
