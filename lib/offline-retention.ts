import fs from 'fs/promises';
import { getAcePath } from '@/lib/cache';
import { prisma } from '@/lib/db';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_REVOKED_RETENTION_DAYS = 7;
const DEFAULT_CLEANUP_BATCH = 40;

function readPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getOfflinePackageRetentionDays() {
  return readPositiveInt(process.env.ACE_OFFLINE_PACKAGE_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
}

export function getRevokedOfflinePackageRetentionDays() {
  return readPositiveInt(process.env.ACE_REVOKED_PACKAGE_RETENTION_DAYS, DEFAULT_REVOKED_RETENTION_DAYS);
}

export function getOfflinePackageRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - getOfflinePackageRetentionDays() * DAY_MS);
}

export function isOfflinePackageExpired(createdAt: Date, now = new Date()) {
  return createdAt.getTime() < getOfflinePackageRetentionCutoff(now).getTime();
}

export async function removeOfflinePackageRecord(input: {
  id: string;
  aceFileKey: string;
}) {
  const acePath = getAcePath(input.aceFileKey);
  await fs.unlink(acePath).catch(() => null);
  await prisma.offlinePackage.delete({ where: { id: input.id } }).catch(() => null);
}

export async function cleanupExpiredOfflinePackages({
  limit = DEFAULT_CLEANUP_BATCH
}: {
  limit?: number;
} = {}) {
  const retentionCutoff = getOfflinePackageRetentionCutoff();
  const revokedCutoff = new Date(Date.now() - getRevokedOfflinePackageRetentionDays() * DAY_MS);

  const candidates = await prisma.offlinePackage.findMany({
    where: {
      OR: [
        { createdAt: { lt: retentionCutoff } },
        { status: 'REVOKED', updatedAt: { lt: revokedCutoff } }
      ]
    },
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, limit),
    select: {
      id: true,
      aceFileKey: true
    }
  });

  let deleted = 0;
  for (const pkg of candidates) {
    await removeOfflinePackageRecord(pkg);
    deleted += 1;
  }

  return {
    deleted,
    scanned: candidates.length,
    retentionDays: getOfflinePackageRetentionDays(),
    revokedRetentionDays: getRevokedOfflinePackageRetentionDays()
  };
}
