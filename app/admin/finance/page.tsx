import Link from 'next/link';
import { headers } from 'next/headers';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import FinanceSettingsForm from '@/components/FinanceSettingsForm';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { formatNaira } from '@/lib/format';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function AdminFinancePage() {
  await requireAdminUser('/admin/finance');
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;
  const showSettlementLedger = getRegionalMoneyDisplay(requestHeaders, 100).currency !== 'NGN';

  const [config, platformWallet, topMovies, recentSettlements, creators, pendingPayouts, settlementAggregate] = await Promise.all([
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
    }),
    prisma.creatorPayoutRequest.count({
      where: { status: 'PENDING' }
    }),
    prisma.unlockSettlement.aggregate({
      _sum: {
        grossNaira: true,
        creatorNaira: true,
        platformNetNaira: true,
        gatewayFeeNaira: true,
        taxNaira: true
      }
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
      description="Monitor platform balance, producer earnings, split settings, unlock statements, and movie performance."
      sideNav={
        <SideNav
          active="/admin/finance"
          items={getAdminNavItems({ pendingPayouts })}
        />
      }
      actions={
        <div className="action-list">
          <Link className="btn btn-primary" href="/admin/payments">Payout approvals</Link>
          <a className="btn btn-ghost" href="#finance-settings">Split controls</a>
          <Link className="btn btn-ghost" href="/admin/users">Producer accounts</Link>
        </div>
      }
    >
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">App commission wallet</span>
          <strong>{formatMoney(platformWallet.balanceNaira)}</strong>
          <span className="trend-up">Live wallet after deductions</span>
        </div>
        <div className="metric-card">
          <span className="muted">Settled platform net</span>
          <strong>{formatMoney(settlementAggregate._sum.platformNetNaira ?? 0)}</strong>
          <span className="trend-up">Commission share recorded from unlocks</span>
        </div>
        <div className="metric-card">
          <span className="muted">Gross unlock revenue</span>
          <strong>{formatMoney(settlementAggregate._sum.grossNaira ?? 0)}</strong>
          <span className="trend-up">Before payout and fee deductions</span>
        </div>
        <div className="metric-card">
          <span className="muted">Producer split</span>
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
        <div className="metric-card">
          <span className="muted">Gateway fees booked</span>
          <strong>{formatMoney(settlementAggregate._sum.gatewayFeeNaira ?? 0)}</strong>
          <span className="trend-up">Recorded payment cost deductions</span>
        </div>
        <div className="metric-card">
          <span className="muted">Tax booked</span>
          <strong>{formatMoney(settlementAggregate._sum.taxNaira ?? 0)}</strong>
          <span className="trend-up">Recorded tax deductions</span>
        </div>
        <div className="metric-card">
          <span className="muted">Pending payouts</span>
          <strong>{pendingPayouts}</strong>
          <span className="trend-up">Producer withdrawal approvals waiting</span>
        </div>
      </div>

      <div className="grid">
        <div id="finance-settings">
          <FinanceSettingsForm
            initialConfig={{
              creatorSharePercent: config.creatorSharePercent,
              platformSharePercent: config.platformSharePercent,
              gatewayFeePercent: config.gatewayFeePercent,
              taxPercent: config.taxPercent
            }}
          />
        </div>

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
                  <span>{formatMoney(movie.grossNaira)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Movie settlement records will appear here after unlocks begin.</p>
          )}
        </div>

        <div className="card">
          <h3>Producer wallets</h3>
          {creators.length ? (
            <div className="stack-list">
              {creators.map((creator) => (
                <div key={creator.creatorNumber ?? creator.user.email} className="stack-row">
                  <div>
                    <strong>{creator.displayName}</strong>
                    <p className="muted">{creator.creatorNumber ?? 'No producer number'} | {creator.user.email}</p>
                  </div>
                  <span>{formatMoney(creator.earningsBalanceNaira)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Producer wallet balances will appear here.</p>
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
                      {settlement.creatorProfile?.displayName ?? 'Unknown producer'} | {settlement.creatorProfile?.creatorNumber ?? 'No producer number'}
                    </p>
                  </div>
                  <span>
                    Producer {formatMoney(settlement.creatorNaira)} / Platform {formatMoney(settlement.platformNetNaira)}
                  </span>
                  {showSettlementLedger ? (
                    <span className="muted">Settlement ledger: {formatNaira(settlement.creatorNaira)} / {formatNaira(settlement.platformNetNaira)}</span>
                  ) : null}
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
