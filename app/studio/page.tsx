import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import Link from 'next/link';

export default function StudioPage() {
  return (
    <DashboardShell
      title="Creator Command Center"
      description="Track real-time unlocks, upload new releases, and manage licensing."
      sideNav={
        <SideNav
          active="/studio"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Contracts' }
          ]}
        />
      }
    >
      <AnalyticsTicker />
      <div className="card">
        <h3>Quick actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" href="/studio/upload">Upload new title</Link>
          <Link className="btn btn-ghost" href="/studio/library">View library</Link>
        </div>
      </div>
    </DashboardShell>
  );
}




