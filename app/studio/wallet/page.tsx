import { headers } from 'next/headers';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorWithdrawPanel from '@/components/CreatorWithdrawPanel';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getFxRate, getRegionalMoneyDisplay, getRegionalCurrency } from '@/lib/pricing';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function StudioWalletPage() {
  const user = await requireCreatorUser('/studio/wallet');
  const requestHeaders = await headers();
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub },
    select: {
      creatorNumber: true,
      earningsBalanceNaira: true,
      payoutRequests: {
        orderBy: { requestedAt: 'desc' },
        take: 20
      },
      settlements: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  });
  const settlements = creatorProfile?.settlements ?? [];
  const settlementVideoIds = Array.from(new Set(settlements.map((settlement) => settlement.videoId).filter(Boolean)));
  const settlementVideos = settlementVideoIds.length
    ? await prisma.video.findMany({
        where: { id: { in: settlementVideoIds } },
        select: { id: true, title: true }
      })
    : [];
  const videoTitleById = new Map<string, string>(settlementVideos.map((video) => [video.id, video.title] as const));
  const payoutRequests = creatorProfile?.payoutRequests ?? [];
  const displayCurrency = getRegionalCurrency(requestHeaders).currency;
  const exchangeRateNaira = getFxRate(displayCurrency);
  const balanceLabel = getRegionalMoneyDisplay(requestHeaders, creatorProfile?.earningsBalanceNaira ?? 0).label;
  const pendingRequests = payoutRequests.filter((request) => request.status === 'PENDING').length;
  const approvedRequests = payoutRequests.filter((request) => request.status === 'APPROVED').length;
  const paidRequests = payoutRequests.filter((request) => request.status === 'PAID').length;
  const recentInflowsTotal = settlements.reduce((sum, settlement) => sum + settlement.creatorNaira, 0);

  return (
    <DashboardShell
      title="Producer wallet"
      description="Track your earnings wallet and every unlock inflow credited to your account."
      sideNav={
        <SideNav
          active="/studio/wallet"
          items={getStudioNavItems()}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#withdrawals">Withdrawal requests</a>
          <a className="btn btn-ghost" href="/studio/library">Release library</a>
          <a className="btn btn-ghost" href="/studio/contact">Support</a>
        </div>
      }
    >
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Available producer balance</span>
          <strong>{balanceLabel}</strong>
          <span className="trend-up">Already excludes pending and approved withdrawals</span>
        </div>
        <div className="metric-card">
          <span className="muted">Waiting admin approval</span>
          <strong>{pendingRequests}</strong>
          <span className={pendingRequests > 0 ? 'trend-warn' : 'trend-up'}>
            {pendingRequests > 0 ? 'Reserved and waiting for review' : 'No pending requests right now'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Approved for payout</span>
          <strong>{approvedRequests}</strong>
          <span className={approvedRequests > 0 ? 'trend-warn' : 'trend-up'}>
            {approvedRequests > 0 ? 'Waiting for admin transfer processing' : 'No approved payouts waiting'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Recent credited inflows</span>
          <strong>{getRegionalMoneyDisplay(requestHeaders, recentInflowsTotal).label}</strong>
          <span className="trend-up">{paidRequests} completed withdrawal{paidRequests === 1 ? '' : 's'} in history</span>
        </div>
      </div>

      <div className="grid">
        <div id="withdrawals">
          <CreatorWithdrawPanel
            balanceNaira={creatorProfile?.earningsBalanceNaira ?? 0}
            balanceLabel={balanceLabel}
            displayCurrency={displayCurrency}
            exchangeRateNaira={exchangeRateNaira}
            payoutRequests={payoutRequests.map((request) => ({
              id: request.id,
              amountLabel: getRegionalMoneyDisplay(requestHeaders, request.amountNaira).label,
              amountNaira: request.amountNaira,
              status: request.status,
              statusDetail:
                request.status === 'PAID' && request.paidAt
                  ? `Paid on ${request.paidAt.toISOString().slice(0, 10)}.`
                  : request.status !== 'PENDING' && request.reviewedAt
                    ? `${request.status === 'APPROVED' ? 'Approved' : 'Reviewed'} on ${request.reviewedAt.toISOString().slice(0, 10)}.`
                    : null,
              adminNote: request.adminNote,
              requestedAt: request.requestedAt.toISOString().slice(0, 10)
            }))}
          />
        </div>
        <div className="card">
          <h3>Wallet operating view</h3>
          <div className="detail-grid" style={{ marginTop: 16 }}>
            <div className="detail-card">
              <span className="detail-label">Producer number</span>
              <strong>{creatorProfile?.creatorNumber ?? 'Pending'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Available balance</span>
              <strong>{balanceLabel}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Pending requests</span>
              <strong>{pendingRequests}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Approved requests</span>
              <strong>{approvedRequests}</strong>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            Once you submit a withdrawal, the amount is reserved immediately. If admin approves it, it stays deducted until paid. If admin rejects it, the amount is restored to your wallet and remains visible in history.
          </p>
        </div>
        <div className="card">
          <h3>Recent inflows</h3>
          {settlements.length ? (
            <div className="stack-list">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="stack-row">
                  <div>
                    <strong>{videoTitleById.get(settlement.videoId) ?? 'Deleted or unavailable title'}</strong>
                    <p className="muted">{settlement.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span>{getRegionalMoneyDisplay(requestHeaders, settlement.creatorNaira).label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Your producer inflows will appear here after viewers unlock your titles.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
