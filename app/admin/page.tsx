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
      description="Moderate uploads, monitor Lagos Relay health, and manage users."
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
    </DashboardShell>
  );
}




