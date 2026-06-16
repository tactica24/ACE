import Link from 'next/link';
import { headers } from 'next/headers';
import AdminOpsPanel from '@/components/AdminOpsPanel';
import AdminDisclosureSection from '@/components/AdminDisclosureSection';
import AdminWorkspacePanel from '@/components/AdminWorkspacePanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import InfrastructureReadiness from '@/components/InfrastructureReadiness';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getViewerPackageStatus } from '@/lib/delivery-package';
import { hasVideoMasterSource } from '@/lib/master-source';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
import { getNodeHealth } from '@/lib/metrics';
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getReconciliationSummary } from '@/lib/reconciliation';
import { getActiveStreamCount } from '@/lib/stream-sessions';
import { getViewerReadyCatalogWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminUser('/admin');
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

  // Core dashboard metrics - fetch only what's needed for the hero section
  let users = 0;
  let approvedVideos = 0;
  let activeStreams = 0;
  let totalRevenue = 0;
  let pendingModeration = 0;
  let openSupport = 0;
  let creatorRequests = 0;
  let pendingPayouts = 0;
  let platformBalance = 0;
  let recentTitles: Array<{ id: string; title: string; status: string; createdAt: Date; packageStatus: string }> = [];
  let reconciliationSummary = {
    pendingPayments: 0,
    stalePendingPayments: 0,
    failedPayments: 0,
    pendingFamilyTransfers: 0
  };
  let nodeHealth: Awaited<ReturnType<typeof getNodeHealth>> | null = null;

  try {
    const [
      usersCount,
      approvedVideosCount,
      activeStreamCount,
      paymentsAggregate,
      pendingModerationCount,
      openSupportCount,
      creatorRequestsCount,
      pendingPayoutCount,
      platformWallet,
      recentTitlesData,
      health,
      summary
      ] = await Promise.all([
      prisma.user.count(),
      prisma.video.count({ where: getViewerReadyCatalogWhere() }),
      getActiveStreamCount(),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amountNaira: true }
      }),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.user.count({ where: { signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED', role: 'USER' } }),
      prisma.creatorPayoutRequest.count({ where: { status: 'PENDING' } }),
      prisma.platformWallet.findUnique({ where: { id: 'ace-platform' } }),
      prisma.video.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          videoType: true,
          seriesId: true,
          primaryStorageKey: true,
          fallbackStorageKey: true,
          technicalMetadata: {
            select: {
              masterKey: true,
              masterSourceUrl: true,
              hlsManifestKey: true,
              hlsReadyAt: true
            }
          },
          _count: { select: { episodes: true } },
          episodes: {
            select: {
              status: true,
              primaryStorageKey: true,
              fallbackStorageKey: true,
              technicalMetadata: {
                select: {
                  masterKey: true,
                  masterSourceUrl: true,
                  hlsManifestKey: true,
                  hlsReadyAt: true
                }
              }
            }
          }
        }
      }),
      getNodeHealth(),
      getReconciliationSummary()
    ]);

    users = usersCount;
    approvedVideos = approvedVideosCount;
    activeStreams = activeStreamCount;
    totalRevenue = paymentsAggregate._sum.amountNaira ?? 0;
    pendingModeration = pendingModerationCount;
    openSupport = openSupportCount;
    creatorRequests = creatorRequestsCount;
    pendingPayouts = pendingPayoutCount;
    platformBalance = platformWallet?.balanceNaira ?? 0;
    nodeHealth = health;
    recentTitles = recentTitlesData.map((video) => ({
      id: video.id,
      title: video.title,
      status: video.status,
      createdAt: video.createdAt,
      packageStatus: getViewerPackageStatus({
        videoType: video.videoType,
        seriesId: video.seriesId,
        primaryReady: Boolean(video.primaryStorageKey),
        fallbackReady: Boolean(video.fallbackStorageKey),
        masterReady: hasVideoMasterSource(video),
        hlsReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt),
        episodeCount: video._count.episodes,
        readyEpisodeCount: video.episodes.filter(
          (episode) => episode.status === 'APPROVED' && hasReadyMoviePlayback(episode)
        ).length
      })
    }));
    reconciliationSummary = summary;
  } catch (error) {
    console.error('Admin dashboard metrics failed:', error);
    // Keep fallback values
  }

  const platformHealth = nodeHealth ?? {
    nodeName: 'Unavailable',
    region: 'Unavailable',
    cpuLoad: 0,
    memoryUsed: 0,
    cacheHitRate: 0,
    diskFreeGb: 0
  };

  return (
    <DashboardShell
      title="Admin Dashboard"
      description="Central command for Ace Studio: monitor platform health, manage accounts, review content, and oversee financial operations."
      sideNav={
        <SideNav
          active="/admin"
          items={getAdminNavItems({ creatorRequests, pendingModeration, openSupport, pendingPayouts })}
        />
      }
      actions={
        <>
          <Link className="btn btn-primary" href="/admin/moderation">Edit titles</Link>
          <Link className="btn btn-ghost" href="/admin/transactions">Transactions</Link>
          <Link className="btn btn-ghost" href="/admin/finance">Finance</Link>
        </>
      }
    >
      {/* Infrastructure snapshot - quick health check */}
      <div className="grid" style={{ marginBottom: 24 }}>
        {await InfrastructureReadiness()}
      </div>

      {/* Workspace panels - primary navigation and task areas */}
      <AdminWorkspacePanel
        creatorRequests={creatorRequests}
        pendingModeration={pendingModeration}
        openSupport={openSupport}
        pendingPayouts={pendingPayouts}
        platformBalanceLabel={formatMoney(platformBalance)}
      />

      {/* Core metrics - at a glance */}
      <div className="metric-grid" style={{ marginTop: 24 }}>
        <div className="metric-card">
          <span className="muted">Total users</span>
          <strong>{users.toLocaleString()}</strong>
          <span className="trend-up">Registered accounts</span>
        </div>
        <div className="metric-card">
          <span className="muted">Approved titles</span>
          <strong>{approvedVideos.toLocaleString()}</strong>
          <span className="trend-up">Live in catalog</span>
        </div>
        <div className="metric-card">
          <span className="muted">Active streams</span>
          <strong>{activeStreams.toLocaleString()}</strong>
          <span className={activeStreams > 30 ? 'trend-warn' : 'trend-up'}>
            {activeStreams > 30 ? 'High concurrency' : 'Viewing active'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Gross revenue</span>
          <strong>{formatMoney(totalRevenue)}</strong>
          <span className="trend-up">All successful payments</span>
        </div>
      </div>

      {/* Quick links and recent activity */}
      <div className="stack-list" style={{ marginTop: 24 }}>
        <AdminDisclosureSection
          title="Recent uploads"
          description="Latest titles submitted by producers, with packaging status and approval state."
          badge="Catalog"
        >
          {recentTitles.length ? (
            <div className="stack-list">
              {recentTitles.map((video) => (
                <div key={video.id} className="stack-row">
                  <div>
                    <strong>{video.title}</strong>
                    <p className="muted">
                      {video.createdAt.toISOString().slice(0, 10)} | {video.packageStatus}
                    </p>
                  </div>
                  <span className={`status-chip ${video.status === 'APPROVED' ? 'status-live' : 'status-review'}`}>
                    {video.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No uploads yet. Producers will appear here when they submit.</p>
          )}
          <div style={{ marginTop: 12 }}>
            <Link className="btn btn-ghost" href="/admin/publish">Publish queue</Link>
          </div>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="System operations"
          description="Commerce reconciliation, payment health, and platform infrastructure status."
          badge="Operations"
        >
          <div className="grid">
            <div className="card">
              <h3>Reconciliation</h3>
              <p className="muted">Keep payment gateways and wallet balances synchronized.</p>
              <AdminOpsPanel initialSummary={reconciliationSummary} />
            </div>

            <div className="card">
              <h3>Platform health</h3>
              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Node</span>
                  <strong>{platformHealth.nodeName}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Region</span>
                  <strong>{platformHealth.region}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">CPU load</span>
                  <strong>{(platformHealth.cpuLoad * 100).toFixed(0)}%</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Memory</span>
                  <strong>{(platformHealth.memoryUsed * 100).toFixed(0)}%</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Cache hit rate</span>
                  <strong>{(platformHealth.cacheHitRate * 100).toFixed(0)}%</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Disk free</span>
                  <strong>{platformHealth.diskFreeGb.toFixed(1)} GB</strong>
                </div>
              </div>
            </div>
          </div>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="Quick links"
          description="Jump to any admin workspace."
          badge="Navigation"
        >
          <div className="action-list" style={{ flexWrap: 'wrap' }}>
            <Link className="btn btn-ghost" href="/admin/users">User accounts</Link>
            <Link className="btn btn-ghost" href="/admin/intake">Producer approvals</Link>
            <Link className="btn btn-ghost" href="/admin/moderation">Edit titles</Link>
            <Link className="btn btn-ghost" href="/admin/publish">Publish queue</Link>
            <Link className="btn btn-ghost" href="/admin/transactions">Customer transactions</Link>
            <Link className="btn btn-ghost" href="/admin/payments">Producer payouts</Link>
            <Link className="btn btn-ghost" href="/admin/finance">Finance console</Link>
            <Link className="btn btn-ghost" href="/admin/reports">Producer reports</Link>
            <Link className="btn btn-ghost" href="/admin/settings">Admin controls</Link>
            <Link className="btn btn-ghost" href="/admin/support">Support inbox</Link>
            <Link className="btn btn-ghost" href="/admin/node">Infrastructure</Link>
            <Link className="btn btn-ghost" href="/admin/referrals">Referrals</Link>
          </div>
        </AdminDisclosureSection>
      </div>
    </DashboardShell>
  );
}
