import Link from 'next/link';

export default function StudioWorkspacePanel({
  verified,
  libraryCount,
  pendingTitles,
  liveTitles,
  walletBalanceLabel,
  unsignedContracts
}: {
  verified: boolean;
  libraryCount: number;
  pendingTitles: number;
  liveTitles: number;
  walletBalanceLabel: string;
  unsignedContracts: number;
}) {
  return (
    <div className="workspace-grid">
      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Identity</span>
          <h3>Account and catalog status</h3>
          <p className="muted">See whether your producer profile, catalog, and release workflow are in good standing.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/onboarding">Open onboarding</Link>
          <Link className="btn btn-ghost" href="/studio/contact">Get help</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Verification</span>
          <strong>{verified ? 'Verified' : 'Awaiting review'}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Releases</span>
          <h3>Release workflow</h3>
          <p className="muted">Create titles, review contracts, monitor moderation, and manage Bunny delivery from one place.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/upload">Create title</Link>
          <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Library / live / pending</span>
          <strong>{libraryCount} / {liveTitles} / {pendingTitles}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Payments</span>
          <h3>Wallet and withdrawals</h3>
          <p className="muted">Track earnings, review payout history, and manage withdrawals from your producer wallet.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/wallet">Open wallet</Link>
          <Link className="btn btn-ghost" href="/studio/library">Recent releases</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Available producer balance</span>
          <strong>{walletBalanceLabel}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Documents</span>
          <h3>Contracts and support</h3>
          <p className="muted">Keep agreements current and contact support quickly when a source intake, contract, or payout issue needs attention.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/contracts">Open documents</Link>
          <Link className="btn btn-ghost" href="/studio/contact">Contact support</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Contracts awaiting signature</span>
          <strong>{unsignedContracts}</strong>
        </div>
      </div>
    </div>
  );
}
