import { NextResponse } from 'next/server';
import { getNodeHealth } from '@/lib/metrics';
import { getConfiguredRelayTargets } from '@/lib/relay';

export const dynamic = 'force-dynamic';

export async function GET() {
  const health = await getNodeHealth();
  return NextResponse.json({
    ok: true,
    nodeName: health.nodeName,
    region: health.region,
    deliveryMode: getConfiguredRelayTargets().length ? 'relay' : 'direct-app',
    cacheHitRate: health.cacheHitRate,
    cpuLoad: health.cpuLoad,
    memoryUsed: health.memoryUsed,
    diskFreeGb: health.diskFreeGb,
    timestamp: new Date().toISOString()
  });
}
