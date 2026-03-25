import { DashboardShell, SideNav } from '@/components/DashboardShell';
import NodeMonitor from '@/components/NodeMonitor';
import { requireAdminUser } from '@/lib/auth-page';

export default async function NodePage() {
  await requireAdminUser('/admin/node');

  return (
    <DashboardShell
      title="Lagos relay monitor"
      description="Real-time health checks for the edge server and cache layer."
      sideNav={
        <SideNav
          active="/admin/node"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Node monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <NodeMonitor />
    </DashboardShell>
  );
}
