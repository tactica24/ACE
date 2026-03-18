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
      <div className="grid">
        <div className="card">
          <h3>Payout formula</h3>
          <p className="muted">Standard and exclusive releases use a 60/40 creator-platform split net of payment gateway fees.</p>
          <p className="muted">Referral incentives come from the platform share, so creator revenue remains protected.</p>
        </div>
        <div className="card">
          <h3>Onboarding and trust</h3>
          <p className="muted">Complete phone, email, ID card, NIN, and bank details in onboarding before expecting payout activation.</p>
          <Link className="btn btn-ghost" href="/studio/onboarding">Complete onboarding</Link>
        </div>
      </div>
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
