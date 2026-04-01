import Link from 'next/link';
import AnalyticsTicker from '@/components/AnalyticsTicker';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import StudioWorkspacePanel from '@/components/StudioWorkspacePanel';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { getStudioNavItems } from '@/lib/studio-nav';

export default async function StudioPage() {
  const user = await requireCreatorUser('/studio');
  const [creatorProfile, videos] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: user.sub },
      select: {
        creatorNumber: true,
        displayName: true,
        verified: true,
        earningsBalanceNaira: true
      }
    }),
    prisma.video.findMany({
      where: { creatorId: user.sub },
      select: { id: true, status: true }
    })
  ]);
  const unsignedContracts = videos.length
    ? await prisma.contract.count({
        where: {
          videoId: { in: videos.map((video) => video.id) },
          producerAccepted: false
        }
      })
    : 0;
  const liveTitles = videos.filter((video) => video.status === 'APPROVED').length;
  const pendingTitles = videos.filter((video) => video.status !== 'APPROVED').length;

  return (
    <DashboardShell
      title="Producer studio"
      description="Manage onboarding, uploads, documents, moderation status, and producer earnings from one organized workspace."
      sideNav={
        <SideNav
          active="/studio"
          items={getStudioNavItems()}
        />
      }
      actions={<Link className="btn btn-primary" href="/studio/upload">Upload a title</Link>}
    >
      <AnalyticsTicker />

      <StudioWorkspacePanel
        verified={creatorProfile?.verified ?? false}
        libraryCount={videos.length}
        pendingTitles={pendingTitles}
        liveTitles={liveTitles}
        walletBalance={creatorProfile?.earningsBalanceNaira ?? 0}
        unsignedContracts={unsignedContracts}
      />

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
          <p className="muted">Complete your profile once so payouts, moderation, and catalog attribution stay accurate.</p>
          <Link className="btn btn-ghost" href="/studio/onboarding">Open onboarding</Link>
        </div>
        <div className="card card-soft">
          <h3>Producer wallet</h3>
          <p className="muted">Track every credited unlock and your current producer balance in one place.</p>
          <Link className="btn btn-ghost" href="/studio/wallet">Open wallet</Link>
        </div>
        <div className="card card-soft">
          <h3>Release workflow</h3>
          <p className="muted">Upload the title, review the contract, check moderation status, and keep your library ready for viewers.</p>
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
