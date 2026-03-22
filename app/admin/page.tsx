import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  let users = 0;
  let videos = 0;
  let pending = 0;

  try {
    [users, videos, pending] = await Promise.all([
      prisma.user.count(),
      prisma.video.count(),
      prisma.moderationItem.count({ where: { status: 'PENDING' } })
    ]);
  } catch {
    users = 0;
    videos = 0;
    pending = 0;
  }

  return (
    <DashboardShell
      title="Admin Console"
      description="Monitor platform quality, content approvals, and growth metrics with a clean command center."
      sideNav={
        <SideNav
          active="/admin"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation', count: `${pending}` },
            { href: '/admin/node', label: 'Node Monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <div className="feature-banner">
        <div>
          <p className="muted">Operations pulse</p>
          <h3>Everything you need to run ACE from one view</h3>
          <p className="muted">Track moderation load, infrastructure health, and ecosystem growth in real time.</p>
        </div>
        <span className="badge">Live</span>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Total users</span>
          <strong>{users}</strong>
          <span className="trend-up">Growing community</span>
        </div>
        <div className="metric-card">
          <span className="muted">Published titles</span>
          <strong>{videos}</strong>
          <span className="trend-up">Catalog expanding</span>
        </div>
        <div className="metric-card">
          <span className="muted">Pending moderation</span>
          <strong>{pending}</strong>
          <span className={pending > 15 ? 'trend-warn' : 'trend-up'}>
            {pending > 15 ? 'Needs attention' : 'Within SLA'}
          </span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Moderation queue</h3>
          <p className="muted">Review, approve, and reject titles instantly with policy-safe guardrails.</p>
        </div>
        <div className="card">
          <h3>Platform health</h3>
          <p className="muted">Track node uptime, stream quality, onboarding funnel, and payouts at a glance.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
