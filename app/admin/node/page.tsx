import { DashboardShell, SideNav } from '@/components/DashboardShell';
import NodeMonitor from '@/components/NodeMonitor';

export default function NodePage() {
  return (
    <DashboardShell
      title="Lagos relay monitor"
      description="Real-time health checks for the edge server and cache layer."
      sideNav={
        <SideNav
          active="/admin/node"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation' },
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
