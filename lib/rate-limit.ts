import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

declare global {
  // eslint-disable-next-line no-var
  var __aceRateLimitCleanupAt: number | undefined;
}

function getCleanupThreshold() {
  return global.__aceRateLimitCleanupAt ?? 0;
}

function markCleanup(now: number) {
  global.__aceRateLimitCleanupAt = now;
}

async function cleanupExpiredBuckets(now: number) {
  if (now - getCleanupThreshold() < 1000 * 60 * 10) {
    return;
  }

  markCleanup(now);
  await prisma.rateLimitBucket.deleteMany({
    where: {
      resetAt: { lt: new Date(now - 1000 * 60 * 60) }
    }
  }).catch(() => null);
}

export function getRateLimitIdentity(req: NextRequest, userId?: string | null) {
  if (userId) {
    return `user:${userId}`;
  }

  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  const fallback = forwarded || realIp || 'anonymous';
  return `ip:${fallback}`;
}

export async function consumeRateLimit({
  key,
  limit,
  windowMs
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const resetAt = new Date(now + windowMs);

  const [bucket] = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;

  void cleanupExpiredBuckets(now);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(limit - bucket.count, 0),
    resetAt: bucket.resetAt.getTime()
  };
}
