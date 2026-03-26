import { prisma } from '@/lib/db';

const ACTIVE_STREAM_WINDOW_MS = 1000 * 60 * 15;
const MAX_CONCURRENT_STREAMS = 3;

function getActiveCutoff() {
  return new Date(Date.now() - ACTIVE_STREAM_WINDOW_MS);
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
  const cutoff = getActiveCutoff();

  await prisma.streamSession.deleteMany({
    where: {
      lastSeenAt: { lt: cutoff }
    }
  });

  const activeSessions = await prisma.streamSession.findMany({
    where: {
      userId,
      revokedAt: null,
      lastSeenAt: { gte: cutoff }
    },
    orderBy: { lastSeenAt: 'desc' }
  });

  const existing = activeSessions.find((session) => session.deviceSessionId === deviceSessionId);

  if (!existing && activeSessions.length >= MAX_CONCURRENT_STREAMS) {
    return {
      allowed: false,
      activeCount: activeSessions.length
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
    activeCount: existing ? activeSessions.length : activeSessions.length + 1,
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
