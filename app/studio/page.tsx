import Link from 'next/link';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';

export default async function StudioPage() {
  await requireCreatorUser('/studio');

  return (
    <DashboardShell
      title="Creator studio"
      description="Manage onboarding, uploads, contracts, and release status from one place."
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
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload a title</Link>}
    >
      <AnalyticsTicker />

      <div className="grid">
        <div className="card card-soft">
          <h3>Creator verification</h3>
          <p className="muted">Complete your profile so payouts, moderation, and catalog attribution stay accurate.</p>
          <Link className="btn btn-ghost" href="/studio/onboarding">Open onboarding</Link>
        </div>
        <div className="card card-soft">
          <h3>Release workflow</h3>
          <div className="action-list">
            <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
            <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
            <Link className="btn btn-ghost" href="/studio/contracts">View contracts</Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
