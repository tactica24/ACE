import { DashboardShell, SideNav } from '@/components/DashboardShell';
import InfrastructureReadiness from '@/components/InfrastructureReadiness';
import NodeMonitor from '@/components/NodeMonitor';
import { requireAdminUser } from '@/lib/auth-page';

export default async function NodePage() {
  await requireAdminUser('/admin/node');

  return (
    <DashboardShell
      title="Infrastructure monitor"
      description="Review the current delivery mode, storage readiness, and runtime health before scaling traffic."
      sideNav={
        <SideNav
          active="/admin/node"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Producer intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <InfrastructureReadiness />
      <NodeMonitor />
    </DashboardShell>
  );
}
