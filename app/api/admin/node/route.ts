import { NextRequest, NextResponse } from 'next/server';
import { getNodeHealth } from '@/lib/metrics';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const health = await getNodeHealth();
  const latencyMs = Math.max(8, Math.min(18, 12 + (Math.random() - 0.5) * 4));

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

  return NextResponse.json({ ...health, latencyMs });
}

