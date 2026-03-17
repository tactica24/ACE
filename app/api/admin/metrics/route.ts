import { prisma } from '@/lib/db';
import { getNodeHealth } from '@/lib/metrics';
import { getAuthFromRequest } from '@/lib/auth';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }

  const [users, videos, unlocks, payments, referrals, node] = await Promise.all([
    prisma.user.count(),
    prisma.video.count({ where: { status: 'APPROVED' } }),
    prisma.unlock.count(),
    prisma.payment.count({ where: { status: 'SUCCESS' } }),
    prisma.referralLink.count(),
    getNodeHealth()
  ]);

  const lines = [
    '# HELP ace_users_total Total registered users',
    '# TYPE ace_users_total gauge',
    `ace_users_total ${users}`,
    '# HELP ace_videos_approved_total Total approved videos',
    '# TYPE ace_videos_approved_total gauge',
    `ace_videos_approved_total ${videos}`,
    '# HELP ace_unlocks_total Total successful unlocks',
    '# TYPE ace_unlocks_total counter',
    `ace_unlocks_total ${unlocks}`,
    '# HELP ace_payments_success_total Total successful payments',
    '# TYPE ace_payments_success_total counter',
    `ace_payments_success_total ${payments}`,
    '# HELP ace_referral_links_total Total referral links',
    '# TYPE ace_referral_links_total gauge',
    `ace_referral_links_total ${referrals}`,
    '# HELP ace_node_cache_hit_rate Current cache hit rate',
    '# TYPE ace_node_cache_hit_rate gauge',
    `ace_node_cache_hit_rate{node="${node.nodeName}",region="${node.region}"} ${node.cacheHitRate}`,
    '# HELP ace_node_cpu_load Current CPU load',
    '# TYPE ace_node_cpu_load gauge',
    `ace_node_cpu_load{node="${node.nodeName}",region="${node.region}"} ${node.cpuLoad}`,
    '# HELP ace_node_memory_used Current memory utilization',
    '# TYPE ace_node_memory_used gauge',
    `ace_node_memory_used{node="${node.nodeName}",region="${node.region}"} ${node.memoryUsed}`
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; version=0.0.4' }
  });
}
