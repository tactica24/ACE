import Link from 'next/link';
import AdminOpsPanel from '@/components/AdminOpsPanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getNodeHealth } from '@/lib/metrics';
import { getReconciliationSummary } from '@/lib/reconciliation';
import { getActiveStreamCount } from '@/lib/stream-sessions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminUser('/admin');

  let users = 0;
  let approvedVideos = 0;
  let pendingModeration = 0;
  let creatorRequests = 0;
  let openSupport = 0;
  let activeStreams = 0;
  let watchingUsers = 0;
  let successfulPayments = 0;
  let totalRevenue = 0;
  let platformBalance = 0;
  let recentTitles: Array<{ id: string; title: string; status: string; createdAt: Date }> = [];
  let topUnlockedTitles: Array<{ title: string; unlocks: number }> = [];
  let recentPayments: Array<{ reference: string; amountNaira: number; status: string; gateway: string; createdAt: Date }> = [];
  let nodeHealth = {
    nodeName: 'ace-node',
    region: 'unknown',
    cpuLoad: 0,
    memoryUsed: 0,
    diskFreeGb: 0,
    cacheHitRate: 0
  };
  let reconciliationSummary = {
    pendingPayments: 0,
    stalePendingPayments: 0,
    failedPayments: 0,
    pendingFamilyTransfers: 0
  };

  try {
    const [paymentsAggregate, recentUnlocks, watchHistoryUsers] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amountNaira: true },
        _count: { _all: true }
      }),
      prisma.unlock.findMany({
        orderBy: { createdAt: 'desc' },
        take: 60,
        include: {
          video: {
            select: { title: true }
          }
        }
      }),
      prisma.watchHistory.findMany({
        where: {
          progressSec: { gt: 0 },
          completedAt: null
        },
        distinct: ['userId'],
        select: { userId: true }
      })
    ]);

    const [
      usersCount,
      approvedVideosCount,
      pendingModerationCount,
      creatorRequestsCount,
      openSupportCount,
      activeStreamCount,
      recentTitlesData,
      recentPaymentsData,
      platformWallet,
      health,
      summary
    ] = await Promise.all([
      prisma.user.count(),
      prisma.video.count({ where: { status: 'APPROVED' } }),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { signupIntent: 'CREATOR', creatorAccessStatus: 'REQUESTED' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      getActiveStreamCount(),
      prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, title: true, status: true, createdAt: true }
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { reference: true, amountNaira: true, status: true, gateway: true, createdAt: true }
      }),
      prisma.platformWallet.findUnique({ where: { id: 'ace-platform' } }),
      getNodeHealth(),
      getReconciliationSummary()
    ]);

    const unlockCounts = new Map<string, number>();
    for (const unlock of recentUnlocks) {
      const title = unlock.video.title;
      unlockCounts.set(title, (unlockCounts.get(title) ?? 0) + 1);
    }

    users = usersCount;
    approvedVideos = approvedVideosCount;
    pendingModeration = pendingModerationCount;
    creatorRequests = creatorRequestsCount;
    openSupport = openSupportCount;
    activeStreams = activeStreamCount;
    watchingUsers = watchHistoryUsers.length;
    successfulPayments = paymentsAggregate._count._all;
    totalRevenue = paymentsAggregate._sum.amountNaira ?? 0;
    platformBalance = platformWallet?.balanceNaira ?? 0;
    recentTitles = recentTitlesData;
    recentPayments = recentPaymentsData;
    nodeHealth = health;
    reconciliationSummary = summary;
    topUnlockedTitles = Array.from(unlockCounts.entries())
      .map(([title, unlocks]) => ({ title, unlocks }))
      .sort((a, b) => b.unlocks - a.unlocks)
      .slice(0, 5);
  } catch {
    // Keep fallback values when the dashboard cannot fully load.
  }

  return (
    <DashboardShell
      title="Admin command center"
      description="Observe trust, commerce, support, streaming, and discovery health from one interactive control surface."
      sideNav={
        <SideNav
          active="/admin"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake', count: `${creatorRequests}` },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation', count: `${pendingModeration}` },
            { href: '/admin/support', label: 'Support', count: `${openSupport}` },
            { href: '/admin/node', label: 'Node monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
      actions={
        <>
          <Link className="btn btn-primary" href="/admin/moderation">Open moderation</Link>
          <Link className="btn btn-ghost" href="/admin/finance">Finance</Link>
        </>
      }
    >
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Users</span>
          <strong>{users}</strong>
          <span className="trend-up">Accounts on platform</span>
        </div>
        <div className="metric-card">
          <span className="muted">Approved titles</span>
          <strong>{approvedVideos}</strong>
          <span className="trend-up">Live in the catalog</span>
        </div>
        <div className="metric-card">
          <span className="muted">Active streams</span>
          <strong>{activeStreams}</strong>
          <span className={activeStreams > 30 ? 'trend-warn' : 'trend-up'}>
            {activeStreams > 30 ? 'Heavy concurrent viewing right now' : 'Concurrency looks healthy'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Resume sessions</span>
          <strong>{watchingUsers}</strong>
          <span className="trend-up">Users with unfinished progress</span>
        </div>
        <div className="metric-card">
          <span className="muted">Successful payments</span>
          <strong>{successfulPayments}</strong>
          <span className="trend-up">Completed commerce events</span>
        </div>
        <div className="metric-card">
          <span className="muted">Revenue</span>
          <strong>NGN {totalRevenue}</strong>
          <span className="trend-up">Gross successful payments</span>
        </div>
        <div className="metric-card">
          <span className="muted">Platform balance</span>
          <strong>NGN {platformBalance}</strong>
          <span className="trend-up">Current platform wallet</span>
        </div>
        <div className="metric-card">
          <span className="muted">Open support</span>
          <strong>{openSupport}</strong>
          <span className={openSupport > 10 ? 'trend-warn' : 'trend-up'}>
            {openSupport > 10 ? 'Support queue needs attention' : 'Support queue stable'}
          </span>
        </div>
      </div>

      <div className="grid">
        <AdminOpsPanel initialSummary={reconciliationSummary} />

        <div className="card">
          <h3>Realtime platform health</h3>
          <div className="detail-grid">
            <div className="detail-card">
              <span className="detail-label">Node</span>
              <strong>{nodeHealth.nodeName}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Region</span>
              <strong>{nodeHealth.region}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">CPU load</span>
              <strong>{(nodeHealth.cpuLoad * 100).toFixed(0)}%</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Memory</span>
              <strong>{(nodeHealth.memoryUsed * 100).toFixed(0)}%</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Cache hit</span>
              <strong>{(nodeHealth.cacheHitRate * 100).toFixed(0)}%</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Disk free</span>
              <strong>{nodeHealth.diskFreeGb.toFixed(1)} GB</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Most opened titles</h3>
          {topUnlockedTitles.length ? (
            <div className="stack-list">
              {topUnlockedTitles.map((item) => (
                <div key={item.title} className="stack-row">
                  <strong>{item.title}</strong>
                  <span className="badge">{item.unlocks} unlocks</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Unlock activity will appear here as viewers keep watching.</p>
          )}
        </div>

        <div className="card">
          <h3>Payment queue</h3>
          {recentPayments.length ? (
            <div className="stack-list">
              {recentPayments.map((payment) => (
                <div key={payment.reference} className="stack-row">
                  <div>
                    <strong>{payment.reference}</strong>
                    <p className="muted">{payment.gateway} | {payment.status}</p>
                  </div>
                  <span className="muted">NGN {payment.amountNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Recent commerce activity will appear here.</p>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Recent uploads</h3>
          {recentTitles.length ? (
            <div className="stack-list">
              {recentTitles.map((video) => (
                <div key={video.id} className="stack-row">
                  <div>
                    <strong>{video.title}</strong>
                    <p className="muted">{video.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span className={`status-chip ${video.status === 'APPROVED' ? 'status-live' : 'status-review'}`}>{video.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Uploads will appear here as creators submit titles.</p>
          )}
        </div>

        <div className="card">
          <h3>Immediate actions</h3>
          <div className="action-list">
            <Link className="btn btn-ghost" href="/admin/intake">Review creator requests</Link>
            <Link className="btn btn-ghost" href="/admin/finance">Open finance console</Link>
            <Link className="btn btn-ghost" href="/admin/moderation">Review pending titles</Link>
            <Link className="btn btn-ghost" href="/admin/users">Check creator verification</Link>
            <Link className="btn btn-ghost" href="/admin/support">Open support inbox</Link>
            <Link className="btn btn-ghost" href="/admin/node">Inspect platform health</Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
