import Link from 'next/link';

export default function StudioWorkspacePanel({
  verified,
  libraryCount,
  pendingTitles,
  liveTitles,
  walletBalance,
  unsignedContracts
}: {
  verified: boolean;
  libraryCount: number;
  pendingTitles: number;
  liveTitles: number;
  walletBalance: number;
  unsignedContracts: number;
}) {
  return (
    <div className="workspace-grid">
      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Profile</span>
          <h3>Studio setup</h3>
          <p className="muted">Keep your producer identity complete so approvals, payouts, and credits stay accurate.</p>
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
          <h3>Upload workflow</h3>
          <p className="muted">Upload, review contract, monitor moderation, and keep your library publication-ready.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
          <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Library / live / pending</span>
          <strong>{libraryCount} / {liveTitles} / {pendingTitles}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Revenue</span>
          <h3>Wallet and payouts</h3>
          <p className="muted">Track unlock earnings, keep payout details correct, and submit withdrawals confidently.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/studio/wallet">Open wallet</Link>
          <Link className="btn btn-ghost" href="/studio/contracts">View documents</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Available producer balance</span>
          <strong>NGN {walletBalance}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Documents</span>
          <h3>Contracts and support</h3>
          <p className="muted">Finish any unsigned agreements and keep admin support close for upload or payout issues.</p>
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
