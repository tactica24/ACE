import Link from 'next/link';

export default function AdminWorkspacePanel({
  creatorRequests,
  pendingModeration,
  openSupport,
  pendingPayouts,
  platformBalanceLabel
}: {
  creatorRequests: number;
  pendingModeration: number;
  openSupport: number;
  pendingPayouts: number;
  platformBalanceLabel: string;
}) {
  return (
    <div className="workspace-grid">
      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">People</span>
          <h3>Users and producers</h3>
          <p className="muted">Review accounts, manage producer access, correct onboarding records, and handle internal account administration.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/admin/users">User control center</Link>
          <Link className="btn btn-ghost" href="/admin/intake">Producer approvals</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Pending producer approvals</span>
          <strong>{creatorRequests}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Catalog</span>
          <h3>Titles and moderation</h3>
          <p className="muted">Review uploads, correct metadata, manage visibility, and keep the public catalog in order.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/admin/moderation">Moderation queue</Link>
          <Link className="btn btn-ghost" href="/admin/settings">Pricing controls</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Titles waiting now</span>
          <strong>{pendingModeration}</strong>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Money</span>
          <h3>Payments and payouts</h3>
          <p className="muted">Review withdrawal requests, confirm completed payouts, and track platform settlement activity.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/admin/payments">Payout operations</Link>
          <Link className="btn btn-ghost" href="/admin/finance">Finance console</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Pending withdrawal approvals</span>
          <strong>{pendingPayouts}</strong>
          <span className="muted">Commission wallet: {platformBalanceLabel}</span>
        </div>
      </div>

      <div className="card workspace-card">
        <div className="stack-list" style={{ gap: 8 }}>
          <span className="badge">Operations</span>
          <h3>Support and platform controls</h3>
          <p className="muted">Handle support issues, review platform settings, and monitor operational controls.</p>
        </div>
        <div className="workspace-links">
          <Link className="btn btn-primary" href="/admin/support">Support inbox</Link>
          <Link className="btn btn-ghost" href="/admin/node">Infrastructure</Link>
        </div>
        <div className="workspace-kpis">
          <span className="muted">Open support cases</span>
          <strong>{openSupport}</strong>
        </div>
      </div>
    </div>
  );
}
