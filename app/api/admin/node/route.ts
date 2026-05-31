import { NextRequest, NextResponse } from 'next/server';
import { getNodeHealth } from '@/lib/metrics';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfiguredRelayTargets } from '@/lib/relay';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const startedAt = Date.now();
  const health = await getNodeHealth();
  const deliveryMode = getConfiguredRelayTargets().length ? 'Bunny CDN + relay' : 'Bunny CDN';
  const latencyMs = Math.max(1, Date.now() - startedAt);
  const latest = await prisma.nodeHealth.findFirst({
    where: { nodeName: health.nodeName },
    orderBy: { createdAt: 'desc' }
  });

  if (!latest || Date.now() - latest.createdAt.getTime() > 60_000) {
    await prisma.nodeHealth.create({
      data: {
        nodeName: health.nodeName,
        region: health.region,
        cpuLoad: health.cpuLoad,
        memoryUsed: health.memoryUsed,
        diskFreeGb: health.diskFreeGb,
        cacheHitRate: health.cacheHitRate,
        latencyMs
      }
    });
  }

  return NextResponse.json({ ...health, latencyMs, deliveryMode });
}
