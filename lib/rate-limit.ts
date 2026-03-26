import { NextRequest } from 'next/server';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

declare global {
  // eslint-disable-next-line no-var
  var __aceRateLimitStore: RateLimitStore | undefined;
}

function getStore() {
  if (!global.__aceRateLimitStore) {
    global.__aceRateLimitStore = new Map();
  }

  return global.__aceRateLimitStore;
}

function cleanupExpiredEntries(store: RateLimitStore, now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
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

export function consumeRateLimit({
  key,
  limit,
  windowMs
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const store = getStore();
  cleanupExpiredEntries(store, now);

  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const next: RateLimitBucket = {
      count: 1,
      resetAt: now + windowMs
    };
    store.set(key, next);
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt: next.resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  store.set(key, current);
  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt };
}
