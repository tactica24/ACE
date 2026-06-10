import { DashboardShell, SideNav } from '@/components/DashboardShell';
import InfrastructureReadiness from '@/components/InfrastructureReadiness';
import NodeMonitor from '@/components/NodeMonitor';
import { getAdminNavItems } from '@/lib/admin-nav';
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
          items={getAdminNavItems()}
        />
      }
    >
      {await InfrastructureReadiness()}
      <NodeMonitor />
    </DashboardShell>
  );
}
