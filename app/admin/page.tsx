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
import { getNodeHealth } from '@/lib/metrics';
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getReconciliationSummary } from '@/lib/reconciliation';
import { getActiveStreamCount } from '@/lib/stream-sessions';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdminUser('/admin');
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

  const activeStreamCutoff = new Date(Date.now() - 1000 * 60 * 15);
  let users = 0;
  let approvedVideos = 0;
  let pendingModeration = 0;
  let creatorRequests = 0;
  let openSupport = 0;
  let activeStreams = 0;
  let watchingUsers = 0;
  let successfulPayments = 0;
  let failedPayments = 0;
  let totalRevenue = 0;
  let platformBalance = 0;
  let platformNetSettled = 0;
  let producerEarningsHeld = 0;
  let creatorVerificationBacklog = 0;
  let pendingPayouts = 0;
  let safetySensitiveTitles = 0;
  let recentTitles: Array<{ id: string; title: string; status: string; createdAt: Date }> = [];
  let topUnlockedTitles: Array<{ title: string; unlocks: number }> = [];
  let recentPayments: Array<{ reference: string; amountNaira: number; status: string; gateway: string; createdAt: Date }> = [];
  let recentFailedPayments: Array<{ reference: string; amountNaira: number; createdAt: Date; userEmail: string }> = [];
  let recentSupportTickets: Array<{ id: string; subject: string; category: string; status: string; createdAt: Date; userEmail: string; userPhone: string }> = [];
  let supportHotspots: Array<{ category: string; total: number }> = [];
  let creatorVerificationQueue: Array<{
    id: string;
    displayName: string;
    verified: boolean;
    bankVerified: boolean;
    ninVerified: boolean;
    idVerified: boolean;
    email: string;
    phone: string;
  }> = [];
  let liveSessions: Array<{ id: string; deviceSessionId: string; lastSeenAt: Date; userEmail: string; videoTitle: string }> = [];
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
    const [paymentsAggregate, recentUnlocks, watchHistoryUsers, failedPaymentsCount, safetySnapshot, settlementAggregate, producerWalletAggregate] = await Promise.all([
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
      }),
      prisma.payment.count({
        where: { status: 'FAILED' }
      }),
      prisma.video.findMany({
        where: { status: 'APPROVED' },
        take: 120,
        select: { ageRating: true, contentWarnings: true }
      }),
      prisma.unlockSettlement.aggregate({
        _sum: {
          platformNetNaira: true
        }
      }),
      prisma.creatorProfile.aggregate({
        _sum: {
          earningsBalanceNaira: true
        }
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
      recentFailedPaymentsData,
      recentSupportTicketsData,
      supportHotspotsData,
      creatorVerificationBacklogCount,
      creatorVerificationQueueData,
      liveSessionData,
      pendingPayoutCount,
      platformWallet,
      health,
      summary
    ] = await Promise.all([
      prisma.user.count(),
      prisma.video.count({ where: { status: 'APPROVED' } }),
      prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED', role: 'USER' } }),
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
      prisma.payment.findMany({
        where: { status: 'FAILED' },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          reference: true,
          amountNaira: true,
          createdAt: true,
          user: {
            select: { email: true }
          }
        }
      }),
      prisma.supportTicket.findMany({
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        select: {
          id: true,
          subject: true,
          category: true,
          status: true,
          createdAt: true,
          user: {
            select: { email: true, phone: true }
          }
        }
      }),
      prisma.supportTicket.groupBy({
        by: ['category'],
        where: {
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        _count: { _all: true }
      }),
      prisma.creatorProfile.count({
        where: {
          user: {
            signupIntent: 'CREATOR',
            creatorAccessStatus: 'SUBMITTED',
            role: 'USER'
          }
        }
      }),
      prisma.creatorProfile.findMany({
        where: {
          user: {
            signupIntent: 'CREATOR',
            creatorAccessStatus: 'SUBMITTED',
            role: 'USER'
          }
        },
        orderBy: { id: 'asc' },
        take: 6,
        select: {
          id: true,
          displayName: true,
          verified: true,
          bankVerified: true,
          ninVerified: true,
          idVerified: true,
          user: {
            select: { email: true, phone: true }
          }
        }
      }),
      prisma.streamSession.findMany({
        where: {
          revokedAt: null,
          lastSeenAt: { gte: activeStreamCutoff }
        },
        orderBy: { lastSeenAt: 'desc' },
        take: 6,
        select: {
          id: true,
          deviceSessionId: true,
          lastSeenAt: true,
          user: {
            select: { email: true }
          },
          video: {
            select: { title: true }
          }
        }
      }),
      prisma.creatorPayoutRequest.count({
        where: { status: 'PENDING' }
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
    failedPayments = failedPaymentsCount;
    totalRevenue = paymentsAggregate._sum.amountNaira ?? 0;
    platformBalance = platformWallet?.balanceNaira ?? 0;
    platformNetSettled = settlementAggregate._sum.platformNetNaira ?? 0;
    producerEarningsHeld = producerWalletAggregate._sum.earningsBalanceNaira ?? 0;
    recentTitles = recentTitlesData;
    recentPayments = recentPaymentsData;
    recentFailedPayments = recentFailedPaymentsData.map((payment) => ({
      reference: payment.reference,
      amountNaira: payment.amountNaira,
      createdAt: payment.createdAt,
      userEmail: payment.user.email
    }));
    recentSupportTickets = recentSupportTicketsData.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      category: ticket.category,
      status: ticket.status,
      createdAt: ticket.createdAt,
      userEmail: ticket.user.email,
      userPhone: ticket.user.phone
    }));
    supportHotspots = supportHotspotsData
      .map((item) => ({ category: item.category, total: item._count._all }))
      .sort((a, b) => b.total - a.total);
    creatorVerificationQueue = creatorVerificationQueueData.map((creator) => ({
      id: creator.id,
      displayName: creator.displayName,
      verified: creator.verified,
      bankVerified: creator.bankVerified,
      ninVerified: creator.ninVerified,
      idVerified: creator.idVerified,
      email: creator.user.email,
      phone: creator.user.phone
    }));
    creatorVerificationBacklog = creatorVerificationBacklogCount;
    pendingPayouts = pendingPayoutCount;
    liveSessions = liveSessionData.map((session) => ({
      id: session.id,
      deviceSessionId: session.deviceSessionId,
      lastSeenAt: session.lastSeenAt,
      userEmail: session.user.email,
      videoTitle: session.video.title
    }));
    nodeHealth = health;
    reconciliationSummary = summary;
    safetySensitiveTitles = safetySnapshot.filter(
      (video) => video.ageRating === 'PG18' || video.contentWarnings.length > 0
    ).length;
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
          items={getAdminNavItems({ creatorRequests, pendingModeration, openSupport, pendingPayouts })}
        />
      }
      actions={
        <>
          <Link className="btn btn-primary" href="/admin/moderation">Open moderation</Link>
          <Link className="btn btn-ghost" href="/admin/payments">Payments</Link>
          <Link className="btn btn-ghost" href="/admin/finance">Finance</Link>
        </>
      }
    >
      <div className="grid">
        <InfrastructureReadiness />
      </div>

      <AdminWorkspacePanel
        creatorRequests={creatorRequests}
        pendingModeration={pendingModeration}
        openSupport={openSupport}
        pendingPayouts={pendingPayouts}
        platformBalanceLabel={formatMoney(platformBalance)}
      />

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
          <span className="muted">Revenue</span>
          <strong>{formatMoney(totalRevenue)}</strong>
          <span className="trend-up">Gross successful payments</span>
        </div>
      </div>

      <div className="stack-list">
        <AdminDisclosureSection
          title="Operational metrics"
          description="Expand for the full platform KPI board, including support, finance, approvals, and safety indicators."
          badge="Metrics"
        >
          <div className="metric-grid">
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
              <span className="muted">Failed payments</span>
              <strong>{failedPayments}</strong>
              <span className={failedPayments > 0 ? 'trend-warn' : 'trend-up'}>
                {failedPayments > 0 ? 'Needs payment support follow-up' : 'Payments are resolving cleanly'}
              </span>
            </div>
            <div className="metric-card">
              <span className="muted">App commission wallet</span>
              <strong>{formatMoney(platformBalance)}</strong>
              <span className="trend-up">Platform net after deductions</span>
            </div>
            <div className="metric-card">
              <span className="muted">Settled platform net</span>
              <strong>{formatMoney(platformNetSettled)}</strong>
              <span className="trend-up">Recorded commission share from unlocks</span>
            </div>
            <div className="metric-card">
              <span className="muted">Producer balances held</span>
              <strong>{formatMoney(producerEarningsHeld)}</strong>
              <span className="trend-up">Outstanding producer earnings</span>
            </div>
            <div className="metric-card">
              <span className="muted">Open support</span>
              <strong>{openSupport}</strong>
              <span className={openSupport > 10 ? 'trend-warn' : 'trend-up'}>
                {openSupport > 10 ? 'Support queue needs attention' : 'Support queue stable'}
              </span>
            </div>
            <div className="metric-card">
              <span className="muted">Producer approvals</span>
              <strong>{creatorVerificationBacklog}</strong>
              <span className={creatorVerificationBacklog > 0 ? 'trend-warn' : 'trend-up'}>
                {creatorVerificationBacklog > 0 ? 'Profiles waiting for admin approval' : 'Producer approvals are current'}
              </span>
            </div>
            <div className="metric-card">
              <span className="muted">Safety-sensitive titles</span>
              <strong>{safetySensitiveTitles}</strong>
              <span className="trend-up">Adult-rated or warning-heavy approved titles</span>
            </div>
          </div>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="Queues and system health"
          description="Open this when you need the full queue board, reconciliation controls, and realtime node health."
          badge="Ops"
        >
          <div className="grid">
            <AdminOpsPanel initialSummary={reconciliationSummary} />

            <div className="card">
              <h3>Priority queues</h3>
              <p className="muted">Work the highest-impact queues first so money, moderation, and support stay under control.</p>
              <div className="action-list">
                <Link className="btn btn-primary" href="/admin/payments">Payout approvals</Link>
                <Link className="btn btn-ghost" href="/admin/moderation">Catalog moderation</Link>
                <Link className="btn btn-ghost" href="/admin/intake">Producer approvals</Link>
                <Link className="btn btn-ghost" href="/admin/support">Support interventions</Link>
                <Link className="btn btn-ghost" href="/admin/finance">Finance console</Link>
                <Link className="btn btn-ghost" href="/admin/users">User control center</Link>
              </div>
              <div className="detail-grid" style={{ marginTop: 14 }}>
                <div className="detail-card">
                  <span className="detail-label">Pending payouts</span>
                  <strong>{pendingPayouts}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Support waiting</span>
                  <strong>{openSupport}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Pending moderation</span>
                  <strong>{pendingModeration}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Producer approvals</span>
                  <strong>{creatorVerificationBacklog}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Commission wallet</span>
                  <strong>{formatMoney(platformBalance)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Failed payments</span>
                  <strong>{failedPayments}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Stale pending payments</span>
                  <strong>{reconciliationSummary.stalePendingPayments}</strong>
                </div>
              </div>
            </div>

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
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="Activity feeds"
          description="Recent commerce, viewing, uploads, support, and producer approval queues are tucked here for when you need a deeper read."
          badge="Feeds"
        >
          <div className="grid">
            <div className="card">
              <h3>Commerce watchlist</h3>
              <p className="muted">Recent payment movement and anything that needs follow-up from finance or support.</p>
              <div className="detail-grid">
                <div className="detail-card">
                  <span className="detail-label">Pending payouts</span>
                  <strong>{pendingPayouts}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Failed payments</span>
                  <strong>{failedPayments}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Revenue</span>
                  <strong>{formatMoney(totalRevenue)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Stale pending payments</span>
                  <strong>{reconciliationSummary.stalePendingPayments}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Commission wallet</span>
                  <strong>{formatMoney(platformBalance)}</strong>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Producer balances held</span>
                  <strong>{formatMoney(producerEarningsHeld)}</strong>
                </div>
              </div>
              <div className="stack-list" style={{ marginTop: 16 }}>
                {recentPayments.length ? (
                  recentPayments.map((payment) => (
                    <div key={payment.reference} className="stack-row">
                      <div>
                        <strong>{payment.reference}</strong>
                        <p className="muted">{payment.gateway} | {payment.status}</p>
                      </div>
                      <span className="muted">{formatMoney(payment.amountNaira)}</span>
                    </div>
                  ))
                ) : (
                  <p className="muted">Recent commerce activity will appear here.</p>
                )}
              </div>
              {recentFailedPayments.length ? (
                <>
                  <h4 style={{ marginTop: 18, marginBottom: 12 }}>Recent payment failures</h4>
                  <div className="stack-list">
                    {recentFailedPayments.map((payment) => (
                      <div key={payment.reference} className="stack-row">
                        <div>
                          <strong>{payment.reference}</strong>
                          <p className="muted">{payment.userEmail}</p>
                        </div>
                        <span className="muted">{formatMoney(payment.amountNaira)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

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
              <h3>Live viewing sessions</h3>
              {liveSessions.length ? (
                <div className="stack-list">
                  {liveSessions.map((session) => (
                    <div key={session.id} className="stack-row">
                      <div>
                        <strong>{session.videoTitle}</strong>
                        <p className="muted">{session.userEmail} | {session.deviceSessionId.slice(0, 8)}</p>
                      </div>
                      <span className="muted">{session.lastSeenAt.toISOString().slice(11, 16)} UTC</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Live playback sessions will appear here when viewers are active.</p>
              )}
            </div>

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
                <p className="muted">Uploads will appear here as producers submit titles.</p>
              )}
            </div>

            <div className="card">
              <h3>Recent support cases</h3>
              {supportHotspots.length ? (
                <div className="detail-badges" style={{ marginBottom: 12 }}>
                  {supportHotspots.map((item) => (
                    <span key={item.category} className="badge">{item.category} {item.total}</span>
                  ))}
                </div>
              ) : null}
              {recentSupportTickets.length ? (
                <div className="stack-list">
                  {recentSupportTickets.map((ticket) => (
                    <div key={ticket.id} className="stack-row">
                      <div>
                        <strong>{ticket.subject}</strong>
                        <p className="muted">{ticket.category} | {ticket.userEmail} | {ticket.userPhone}</p>
                      </div>
                      <span className={`status-chip ${ticket.status === 'RESOLVED' ? 'status-live' : 'status-review'}`}>{ticket.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Open support cases will appear here.</p>
              )}
            </div>

            <div className="card">
              <h3>Producer approval queue</h3>
              {creatorVerificationQueue.length ? (
                <div className="stack-list">
                  {creatorVerificationQueue.map((creator) => (
                    <div key={creator.id} className="stack-row">
                      <div>
                        <strong>{creator.displayName}</strong>
                        <p className="muted">{creator.email} | {creator.phone}</p>
                        <p className="muted">
                          Identity {creator.idVerified ? 'ok' : 'pending'} | NIN {creator.ninVerified ? 'ok' : 'pending'} | Bank {creator.bankVerified ? 'ok' : 'pending'}
                        </p>
                      </div>
                      <span className={`status-chip ${creator.verified ? 'status-live' : 'status-review'}`}>
                        {creator.verified ? 'Verified' : 'Needs review'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Producer approval backlog is clear.</p>
              )}
            </div>
          </div>
        </AdminDisclosureSection>
      </div>
    </DashboardShell>
  );
}
