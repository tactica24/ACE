import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import Link from 'next/link';

const creatorHighlights = [
  { label: 'Weekly Revenue', value: '$4,920', trend: '+18%' },
  { label: 'Engaged Fans', value: '12.4k', trend: '+9%' },
  { label: 'Retention', value: '76%', trend: '+6%' }
];

export default function StudioPage() {
  return (
    <DashboardShell
      title="Creator Studio"
      description="Run your creative business with publishing, analytics, and growth tools from one command center."
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

      <div className="feature-banner">
        <div>
          <p className="muted">Creator spotlight</p>
          <h3>Launch faster with AI-assisted release workflows</h3>
          <p className="muted">Generate launch copy, optimize thumbnails, and schedule drops in minutes.</p>
        </div>
        <Link className="btn btn-primary" href="/studio/upload">Start a release</Link>
      </div>

      <div className="metric-grid">
        {creatorHighlights.map((item) => (
          <div className="metric-card" key={item.label}>
            <span className="muted">{item.label}</span>
            <strong>{item.value}</strong>
            <span className="trend-up">{item.trend} this week</span>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="card card-soft">
          <h3>Verification</h3>
          <p className="muted">Complete your creator verification to unlock payouts and featured placement.</p>
          <Link className="btn btn-ghost" href="/studio/onboarding">Complete onboarding</Link>
        </div>
        <div className="card card-soft">
          <h3>Quick actions</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
            <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
