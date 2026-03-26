import { prisma } from '@/lib/db';

const ACTIVE_STREAM_WINDOW_MS = 1000 * 60 * 15;
const MAX_CONCURRENT_STREAMS = 3;

declare global {
  // eslint-disable-next-line no-var
  var __aceStreamCleanupAt: number | undefined;
}

function getActiveCutoff() {
  return new Date(Date.now() - ACTIVE_STREAM_WINDOW_MS);
}

function getCleanupThreshold() {
  return global.__aceStreamCleanupAt ?? 0;
}

function markCleanup(now: number) {
  global.__aceStreamCleanupAt = now;
}

async function cleanupInactiveStreamSessions() {
  const now = Date.now();
  if (now - getCleanupThreshold() < 1000 * 60 * 10) {
    return;
  }

  markCleanup(now);
  await prisma.streamSession.updateMany({
    where: {
      revokedAt: null,
      lastSeenAt: { lt: getActiveCutoff() }
    },
    data: {
      revokedAt: new Date(now)
    }
  }).catch(() => null);
}

export async function ensureStreamSession({
  userId,
  deviceSessionId,
  videoId
}: {
  userId: string;
  deviceSessionId: string;
  videoId: string;
}) {
  void cleanupInactiveStreamSessions();
  const cutoff = getActiveCutoff();
  const existingSession = await prisma.streamSession.findUnique({
    where: {
      userId_deviceSessionId: {
        userId,
        deviceSessionId
      }
    },
    select: {
      id: true,
      lastSeenAt: true,
      revokedAt: true
    }
  });

  const existingIsActive = Boolean(
    existingSession &&
    existingSession.revokedAt === null &&
    existingSession.lastSeenAt >= cutoff
  );

  const activeOtherSessions = await prisma.streamSession.count({
    where: {
      userId,
      revokedAt: null,
      lastSeenAt: { gte: cutoff },
      NOT: { deviceSessionId }
    }
  });

  if (!existingIsActive && activeOtherSessions >= MAX_CONCURRENT_STREAMS) {
    return {
      allowed: false,
      activeCount: activeOtherSessions
    };
  }

  const session = await prisma.streamSession.upsert({
    where: {
      userId_deviceSessionId: {
        userId,
        deviceSessionId
      }
    },
    update: {
      videoId,
      lastSeenAt: new Date(),
      revokedAt: null
    },
    create: {
      userId,
      deviceSessionId,
      videoId
    }
  });

  return {
    allowed: true,
    activeCount: activeOtherSessions + 1,
    session
  };
}

export async function touchStreamSession({
  userId,
  deviceSessionId,
  videoId
}: {
  userId: string;
  deviceSessionId?: string;
  videoId: string;
}) {
  if (!deviceSessionId) {
    return;
  }

  void cleanupInactiveStreamSessions();

  await prisma.streamSession.updateMany({
    where: {
      userId,
      deviceSessionId,
      revokedAt: null
    },
    data: {
      videoId,
      lastSeenAt: new Date()
    }
  });
}

export async function getActiveStreamCount() {
  return prisma.streamSession.count({
    where: {
      revokedAt: null,
      lastSeenAt: { gte: getActiveCutoff() }
    }
  });
}
