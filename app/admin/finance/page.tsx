import { DashboardShell, SideNav } from '@/components/DashboardShell';
import FinanceSettingsForm from '@/components/FinanceSettingsForm';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AdminFinancePage() {
  await requireAdminUser('/admin/finance');

  const [config, platformWallet, topMovies, recentSettlements, creators] = await Promise.all([
    prisma.financeConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', creatorSharePercent: 60, platformSharePercent: 29.5, gatewayFeePercent: 3, taxPercent: 7.5 }
    }),
    prisma.platformWallet.upsert({
      where: { id: 'ace-platform' },
      update: {},
      create: { id: 'ace-platform', balanceNaira: 0 }
    }),
    prisma.video.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { settlements: true, creator: { include: { creator: true } } }
    }),
    prisma.unlockSettlement.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { video: { select: { title: true } }, creatorProfile: { select: { creatorNumber: true, displayName: true } } }
    }),
    prisma.creatorProfile.findMany({
      orderBy: { earningsBalanceNaira: 'desc' },
      take: 30,
      select: { creatorNumber: true, displayName: true, earningsBalanceNaira: true, user: { select: { email: true } } }
    })
  ]);

  const movies = topMovies
    .map((video) => ({
      id: video.id,
      title: video.title,
      creator: video.creator.creator?.displayName ?? video.creator.email,
      unlockCount: video.settlements.length,
      grossNaira: video.settlements.reduce((sum, item) => sum + item.grossNaira, 0),
      creatorNaira: video.settlements.reduce((sum, item) => sum + item.creatorNaira, 0),
      platformNetNaira: video.settlements.reduce((sum, item) => sum + item.platformNetNaira, 0)
    }))
    .sort((a, b) => b.grossNaira - a.grossNaira);

  return (
    <DashboardShell
      title="Finance console"
      description="Monitor platform balance, creator earnings, split settings, unlock statements, and movie performance."
      sideNav={
        <SideNav
          active="/admin/finance"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
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
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Ace Studio wallet</span>
          <strong>NGN {platformWallet.balanceNaira}</strong>
          <span className="trend-up">App-recorded net platform balance</span>
        </div>
        <div className="metric-card">
          <span className="muted">Creator split</span>
          <strong>{config.creatorSharePercent}%</strong>
          <span className="trend-up">Global default</span>
        </div>
        <div className="metric-card">
          <span className="muted">Platform split</span>
          <strong>{config.platformSharePercent}%</strong>
          <span className="trend-up">Global default</span>
        </div>
        <div className="metric-card">
          <span className="muted">Gateway + tax</span>
          <strong>{config.gatewayFeePercent + config.taxPercent}%</strong>
          <span className="trend-up">Global default</span>
        </div>
      </div>

      <div className="grid">
        <FinanceSettingsForm
          initialConfig={{
            creatorSharePercent: config.creatorSharePercent,
            platformSharePercent: config.platformSharePercent,
            gatewayFeePercent: config.gatewayFeePercent,
            taxPercent: config.taxPercent
          }}
        />

        <div className="card">
          <h3>Top movie impact</h3>
          {movies.length ? (
            <div className="stack-list">
              {movies.map((movie) => (
                <div key={movie.id} className="stack-row">
                  <div>
                    <strong>{movie.title}</strong>
                    <p className="muted">{movie.creator} | {movie.unlockCount} unlocks</p>
                  </div>
                  <span>NGN {movie.grossNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Movie settlement records will appear here after unlocks begin.</p>
          )}
        </div>

        <div className="card">
          <h3>Creator wallets</h3>
          {creators.length ? (
            <div className="stack-list">
              {creators.map((creator) => (
                <div key={creator.creatorNumber ?? creator.user.email} className="stack-row">
                  <div>
                    <strong>{creator.displayName}</strong>
                    <p className="muted">{creator.creatorNumber ?? 'No creator number'} | {creator.user.email}</p>
                  </div>
                  <span>NGN {creator.earningsBalanceNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Creator wallet balances will appear here.</p>
          )}
        </div>

        <div className="card">
          <h3>Recent settlement statements</h3>
          {recentSettlements.length ? (
            <div className="stack-list">
              {recentSettlements.map((settlement) => (
                <div key={settlement.id} className="stack-row">
                  <div>
                    <strong>{settlement.video.title}</strong>
                    <p className="muted">
                      {settlement.creatorProfile?.displayName ?? 'Unknown creator'} | {settlement.creatorProfile?.creatorNumber ?? 'No creator number'}
                    </p>
                  </div>
                  <span>Creator NGN {settlement.creatorNaira} / Platform NGN {settlement.platformNetNaira}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Settlement statements will appear here after viewer unlocks.</p>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
