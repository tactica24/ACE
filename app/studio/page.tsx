import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import Link from 'next/link';

export default function StudioPage() {
  return (
    <DashboardShell
      title="Creator Studio"
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
      <div className="grid">
        <div className="card">
          <h3>Performance</h3>
          <p className="muted">Real-time unlock and revenue telemetry.</p>
        </div>
        <div className="card">
          <h3>Verification</h3>
          <Link className="btn btn-ghost" href="/studio/onboarding">Complete onboarding</Link>
        </div>
      </div>
      <div className="card">
        <h3>Quick actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
          <Link className="btn btn-ghost" href="/studio/library">Library</Link>
        </div>
      </div>
    </DashboardShell>
  );
}
