import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';

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
      <div className="grid">
        <div className="card"><strong>{users}</strong><p className="muted">Users</p></div>
        <div className="card"><strong>{videos}</strong><p className="muted">Titles</p></div>
        <div className="card"><strong>{pending}</strong><p className="muted">Pending</p></div>
      </div>
      <div className="grid">
        <div className="card">
          <h3>Moderation queue</h3>
          <p className="muted">Review, approve, and reject titles instantly.</p>
        </div>
        <div className="card">
          <h3>Platform health</h3>
          <p className="muted">Track node status, users, catalog and referrals.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
