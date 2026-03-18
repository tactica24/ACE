import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';

export default async function AdminPage() {
  const [users, videos, pending] = await Promise.all([
    prisma.user.count(),
    prisma.video.count(),
    prisma.moderationItem.count({ where: { status: 'PENDING' } })
  ]);

  return (
    <DashboardShell
      title="Admin Control"
      description="Moderate uploads, monitor relay health, manage users, and oversee platform economics."
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
        <div className="card"><strong>{users}</strong><p className="muted">Total users</p></div>
        <div className="card"><strong>{videos}</strong><p className="muted">Total videos</p></div>
        <div className="card"><strong>{pending}</strong><p className="muted">Pending approvals</p></div>
      </div>
      <div className="grid">
        <div className="card">
          <h3>Billing engine</h3>
          <p className="muted">Creator share: 60% net. Platform share: 40% net after gateway fees.</p>
          <p className="muted">Referral commissions are paid from the platform 40%, not from the creator share.</p>
        </div>
        <div className="card">
          <h3>Release control</h3>
          <p className="muted">Approved videos move to production instantly because browse and stream routes only expose titles with status `APPROVED`.</p>
          <p className="muted">Admins can reject or remove titles from production with recorded reasons in moderation.</p>
        </div>
      </div>
    </DashboardShell>
  );
}
