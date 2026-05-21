import { prisma } from '@/lib/db';
import { getNodeHealth } from '@/lib/metrics';
import { getAuthFromRequest } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { getReconciliationSummary } from '@/lib/reconciliation';
import { getActiveStreamCount } from '@/lib/stream-sessions';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return new Response('Unauthorized', { status: 401 });
  }

  const [users, videos, unlocks, payments, failedPayments, referrals, openSupport, creatorVerificationBacklog, node, activeStreams, reconciliation] = await Promise.all([
    prisma.user.count(),
    prisma.video.count({ where: getViewerReadyCatalogWhere() }),
    prisma.unlock.count(),
    prisma.payment.count({ where: { status: 'SUCCESS' } }),
    prisma.payment.count({ where: { status: 'FAILED' } }),
    prisma.referralLink.count(),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.creatorProfile.count({
      where: {
        OR: [
          { verified: false },
          { bankVerified: false },
          { ninVerified: false },
          { idVerified: false }
        ]
      }
    }),
    getNodeHealth(),
    getActiveStreamCount(),
    getReconciliationSummary()
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
    '# HELP ace_payments_failed_total Total failed payments',
    '# TYPE ace_payments_failed_total counter',
    `ace_payments_failed_total ${failedPayments}`,
    '# HELP ace_referral_links_total Total referral links',
    '# TYPE ace_referral_links_total gauge',
    `ace_referral_links_total ${referrals}`,
    '# HELP ace_support_open_total Total open or in-progress support tickets',
    '# TYPE ace_support_open_total gauge',
    `ace_support_open_total ${openSupport}`,
    '# HELP ace_creator_verification_backlog_total Creator profiles pending verification checks',
    '# TYPE ace_creator_verification_backlog_total gauge',
    `ace_creator_verification_backlog_total ${creatorVerificationBacklog}`,
    '# HELP ace_active_streams_total Active concurrent playback sessions',
    '# TYPE ace_active_streams_total gauge',
    `ace_active_streams_total ${activeStreams}`,
    '# HELP ace_pending_payments_total Pending payment records',
    '# TYPE ace_pending_payments_total gauge',
    `ace_pending_payments_total ${reconciliation.pendingPayments}`,
    '# HELP ace_stale_pending_payments_total Pending payments older than the reconciliation threshold',
    '# TYPE ace_stale_pending_payments_total gauge',
    `ace_stale_pending_payments_total ${reconciliation.stalePendingPayments}`,
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
