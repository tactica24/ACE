import { DashboardShell, SideNav } from '@/components/DashboardShell';
import CreatorWithdrawPanel from '@/components/CreatorWithdrawPanel';
import { requireCreatorUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export default async function StudioWalletPage() {
  const user = await requireCreatorUser('/studio/wallet');
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: user.sub },
    select: {
      creatorNumber: true,
      earningsBalanceNaira: true,
      payoutRequests: {
        orderBy: { requestedAt: 'desc' },
        take: 20
      },
      settlements: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { video: { select: { title: true } } }
      }
    }
  });
  const settlements = creatorProfile?.settlements ?? [];

  return (
    <DashboardShell
      title="Creator wallet"
      description="Track your earnings wallet and every unlock inflow credited to your account."
      sideNav={
        <SideNav
          active="/studio/wallet"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/wallet', label: 'Wallet' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Contracts' },
            { href: '/studio/contact', label: 'Contact' }
          ]}
        />
      }
    >
      <div className="grid">
        <div className="card">
          <h3>Creator wallet balance</h3>
          <p className="hero-title" style={{ fontSize: '2rem' }}>NGN {creatorProfile?.earningsBalanceNaira ?? 0}</p>
          <p className="muted">Creator number: {creatorProfile?.creatorNumber ?? 'Pending'}</p>
        </div>
        <CreatorWithdrawPanel
          balanceNaira={creatorProfile?.earningsBalanceNaira ?? 0}
          payoutRequests={(creatorProfile?.payoutRequests ?? []).map((request) => ({
            id: request.id,
            amountNaira: request.amountNaira,
            status: request.status,
            adminNote: request.adminNote,
            requestedAt: request.requestedAt.toISOString().slice(0, 10)
          }))}
        />
        <div className="card">
          <h3>Recent inflows</h3>
          {settlements.length ? (
            <div className="stack-list">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="stack-row">
                  <div>
                    <strong>{settlement.video.title}</strong>
                    <p className="muted">{settlement.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                  <span>NGN {settlement.creatorNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Your creator inflows will appear here after viewers unlock your titles.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
