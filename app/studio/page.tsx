import Link from 'next/link';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export default async function StudioPage() {
  const user = await requireCreatorUser('/studio');
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub },
    select: {
      creatorNumber: true,
      displayName: true,
      verified: true
    }
  });

  return (
    <DashboardShell
      title="Producer studio"
      description="Manage onboarding, uploads, signed documents, and release status from one place."
      sideNav={
        <SideNav
          active="/studio"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/wallet', label: 'Wallet' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Documents' },
            { href: '/studio/contact', label: 'Contact' }
          ]}
        />
      }
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload a title</Link>}
    >
      <AnalyticsTicker />

      <div className="grid">
        <div className="card">
          <h3>Studio identity</h3>
          <div className="stack-list" style={{ gap: 8 }}>
            <p className="muted" style={{ margin: 0 }}>Registered name: {user.name ?? 'Not set yet'}</p>
            <p className="muted" style={{ margin: 0 }}>Display name: {creatorProfile?.displayName ?? user.name ?? 'Pending onboarding'}</p>
            <p className="muted" style={{ margin: 0 }}>Producer number: {creatorProfile?.creatorNumber ?? 'Pending assignment'}</p>
            <p className="muted" style={{ margin: 0 }}>Email: {user.email}</p>
            <p className="muted" style={{ margin: 0 }}>Verification status: {creatorProfile?.verified ? 'Verified producer' : 'Awaiting review'}</p>
          </div>
        </div>
        <div className="card card-soft">
          <h3>Producer verification</h3>
          <p className="muted">Complete your profile so payouts, moderation, and catalog attribution stay accurate.</p>
          <Link className="btn btn-ghost" href="/studio/onboarding">Open onboarding</Link>
        </div>
        <div className="card card-soft">
          <h3>Producer wallet</h3>
          <p className="muted">Track every credited unlock and your current producer balance in one place.</p>
          <Link className="btn btn-ghost" href="/studio/wallet">Open wallet</Link>
        </div>
        <div className="card card-soft">
          <h3>Release workflow</h3>
          <p className="muted">Upload the title, set category and age rating, add content advisories, then attach subtitle files for every language you want households to switch to.</p>
          <div className="action-list">
            <Link className="btn btn-primary" href="/studio/upload">Upload title</Link>
            <Link className="btn btn-ghost" href="/studio/wallet">View wallet</Link>
            <Link className="btn btn-ghost" href="/studio/library">Open library</Link>
            <Link className="btn btn-ghost" href="/studio/contracts">View documents</Link>
            <Link className="btn btn-ghost" href="/studio/contact">Contact support</Link>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
