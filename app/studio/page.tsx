import Link from 'next/link';
import { headers } from 'next/headers';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import StudioWorkspacePanel from '@/components/StudioWorkspacePanel';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function StudioPage() {
  const user = await requireCreatorUser('/studio');
  const requestHeaders = headers();
  const [creatorProfile, videos] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: user.sub },
      select: {
        creatorNumber: true,
        displayName: true,
        verified: true,
        earningsBalanceNaira: true
      }
    }),
    prisma.video.findMany({
      where: { creatorId: user.sub },
      select: { id: true, status: true }
    })
  ]);
  const unsignedContracts = videos.length
    ? await prisma.contract.count({
        where: {
          videoId: { in: videos.map((video) => video.id) },
          producerAccepted: false
        }
      })
    : 0;
  const liveTitles = videos.filter((video) => video.status === 'APPROVED').length;
  const pendingTitles = videos.filter((video) => video.status !== 'APPROVED').length;
  const walletBalanceLabel = getRegionalMoneyDisplay(requestHeaders, creatorProfile?.earningsBalanceNaira ?? 0).label;

  return (
    <DashboardShell
      title="Studio Dashboard"
      description="Manage your producer profile, uploads, contracts, release status, and earnings from one internal dashboard."
      sideNav={
        <SideNav
          active="/studio"
          items={getStudioNavItems()}
        />
      }
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload a title</Link>}
    >
      <AnalyticsTicker />

      <StudioWorkspacePanel
        verified={creatorProfile?.verified ?? false}
        libraryCount={videos.length}
        pendingTitles={pendingTitles}
        liveTitles={liveTitles}
        walletBalanceLabel={walletBalanceLabel}
        unsignedContracts={unsignedContracts}
      />

      <div className="grid">
        <div className="card">
          <h3>Studio snapshot</h3>
          <p className="muted">A current summary of your producer account, catalog activity, documentation, and earnings.</p>
          <div className="detail-grid" style={{ marginTop: 16 }}>
            <div className="detail-card">
              <span className="detail-label">Registered name</span>
              <strong>{user.name ?? 'Not set yet'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Display name</span>
              <strong>{creatorProfile?.displayName ?? user.name ?? 'Pending onboarding'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Producer number</span>
              <strong>{creatorProfile?.creatorNumber ?? 'Pending assignment'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Verification</span>
              <strong>{creatorProfile?.verified ? 'Verified producer' : 'Awaiting review'}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Library health</span>
              <strong>{liveTitles} live / {pendingTitles} pending</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Available wallet</span>
              <strong>{walletBalanceLabel}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Unsigned documents</span>
              <strong>{unsignedContracts}</strong>
            </div>
            <div className="detail-card">
              <span className="detail-label">Account email</span>
              <strong>{user.email}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>What needs attention</h3>
          <div className="stack-list" style={{ marginTop: 16 }}>
            <div className="stack-row">
              <div>
                <strong>Verification and profile</strong>
                <p className="muted">Keep your producer profile complete so title ownership, payments, and documentation remain accurate.</p>
              </div>
              <span className={`status-chip ${creatorProfile?.verified ? 'status-live' : 'status-review'}`}>
                {creatorProfile?.verified ? 'Ready' : 'Needs review'}
              </span>
            </div>
            <div className="stack-row">
              <div>
                <strong>Release queue</strong>
                <p className="muted">Track titles that are still in review so releases move from upload to publication without delay.</p>
              </div>
              <span className={`status-chip ${pendingTitles === 0 ? 'status-live' : 'status-review'}`}>
                {pendingTitles === 0 ? 'Clear' : `${pendingTitles} pending`}
              </span>
            </div>
            <div className="stack-row">
              <div>
                <strong>Wallet and withdrawals</strong>
                <p className="muted">Review current earnings and any payout requests linked to your producer account.</p>
              </div>
              <span className="status-chip status-live">{walletBalanceLabel}</span>
            </div>
            <div className="stack-row">
              <div>
                <strong>Contracts and support</strong>
                <p className="muted">Keep required agreements current and contact support quickly when an operational issue needs attention.</p>
              </div>
              <span className={`status-chip ${unsignedContracts === 0 ? 'status-live' : 'status-review'}`}>
                {unsignedContracts === 0 ? 'Current' : `${unsignedContracts} open`}
              </span>
            </div>
          </div>
          <div className="action-list" style={{ marginTop: 18 }}>
            <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
            <Link className="btn btn-ghost" href="/studio/wallet">View wallet</Link>
            <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
            <Link className="btn btn-ghost" href="/studio/contracts">View documents</Link>
            <Link className="btn btn-ghost" href="/studio/onboarding">Open onboarding</Link>
            <Link className="btn btn-ghost" href="/studio/contact">Contact support</Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
