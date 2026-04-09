import Link from 'next/link';
import { headers } from 'next/headers';
import CreatorPayoutAdmin from '@/components/CreatorPayoutAdmin';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { formatNaira } from '@/lib/format';
import { getAdminNavItems } from '@/lib/admin-nav';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  await requireAdminUser('/admin/payments');
  const requestHeaders = headers();

  const [payoutRequests, topProducerBalances] = await Promise.all([
    prisma.creatorPayoutRequest.findMany({
      orderBy: [{ status: 'asc' }, { requestedAt: 'desc' }],
      take: 80,
      include: {
        creatorProfile: {
          select: {
            creatorNumber: true,
            displayName: true,
            earningsBalanceNaira: true,
            user: {
              select: { email: true }
            }
          }
        }
      }
    }),
    prisma.creatorProfile.findMany({
      orderBy: { earningsBalanceNaira: 'desc' },
      take: 8,
      select: {
        creatorNumber: true,
        displayName: true,
        earningsBalanceNaira: true,
        user: { select: { email: true } }
      }
    })
  ]);

  const pendingPayouts = payoutRequests.filter((request) => request.status === 'PENDING').length;
  const approvedPayouts = payoutRequests.filter((request) => request.status === 'APPROVED').length;
  const paidPayouts = payoutRequests.filter((request) => request.status === 'PAID').length;
  const reservedPayoutNaira = payoutRequests
    .filter((request) => request.status === 'PENDING' || request.status === 'APPROVED')
    .reduce((sum, request) => sum + request.amountNaira, 0);

  return (
    <DashboardShell
      title="Payments operations"
      description="Handle producer withdrawal requests, monitor payout exposure, and keep status updates synchronized with producer wallets."
      sideNav={
        <SideNav
          active="/admin/payments"
          items={getAdminNavItems({ pendingPayouts })}
        />
      }
      actions={
        <div className="action-list">
          <Link className="btn btn-primary" href="/admin/finance">Finance console</Link>
          <Link className="btn btn-ghost" href="/admin/users">Producer accounts</Link>
          <Link className="btn btn-ghost" href="/admin/support">Support inbox</Link>
        </div>
      }
    >
      <div className="metric-grid">
        <div className="metric-card">
          <span className="muted">Needs approval</span>
          <strong>{pendingPayouts}</strong>
          <span className={pendingPayouts > 0 ? 'trend-warn' : 'trend-up'}>
            {pendingPayouts > 0 ? 'Producer requests waiting for review' : 'Approval queue is clear'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Approved waiting transfer</span>
          <strong>{approvedPayouts}</strong>
          <span className={approvedPayouts > 0 ? 'trend-warn' : 'trend-up'}>
            {approvedPayouts > 0 ? 'Ops should complete bank transfer and mark paid' : 'No approved payouts waiting'}
          </span>
        </div>
        <div className="metric-card">
          <span className="muted">Completed payouts</span>
          <strong>{paidPayouts}</strong>
          <span className="trend-up">Producer history already reflects these transfers</span>
        </div>
        <div className="metric-card">
          <span className="muted">Reserved payout exposure</span>
          <strong>{getRegionalMoneyDisplay(requestHeaders, reservedPayoutNaira).label}</strong>
          <span className="trend-up">Pending and approved requests combined</span>
        </div>
      </div>

      <CreatorPayoutAdmin
        reservedExposureLabel={getRegionalMoneyDisplay(requestHeaders, reservedPayoutNaira).label}
        initialRequests={payoutRequests.map((request) => ({
          id: request.id,
          creatorName: request.creatorProfile.displayName,
          creatorEmail: request.creatorProfile.user.email,
          amountLabel: getRegionalMoneyDisplay(requestHeaders, request.amountNaira).label,
          settlementLabel: formatNaira(request.amountNaira),
          amountNaira: request.amountNaira,
          bankName: request.bankName,
          bankAccountName: request.bankAccountName,
          bankAccountNumber: request.bankAccountNumber,
          status: request.status,
          requestedAt: request.requestedAt.toISOString().slice(0, 10),
          reviewedAt: request.reviewedAt?.toISOString().slice(0, 10) ?? null,
          paidAt: request.paidAt?.toISOString().slice(0, 10) ?? null,
          adminNote: request.adminNote
        }))}
      />

      <div className="grid">
        <div className="card">
          <h3>Producer wallet exposure</h3>
          <p className="muted">Use this list when you need to check which producers are currently carrying the largest available wallet balances.</p>
          {topProducerBalances.length ? (
            <div className="stack-list" style={{ marginTop: 16 }}>
              {topProducerBalances.map((creator) => (
                <div key={creator.creatorNumber ?? creator.user.email} className="stack-row">
                  <div>
                    <strong>{creator.displayName}</strong>
                    <p className="muted">
                      {creator.creatorNumber ?? 'No producer number'} | {creator.user.email}
                    </p>
                  </div>
                  <span>{getRegionalMoneyDisplay(requestHeaders, creator.earningsBalanceNaira).label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Producer wallet balances will appear here as unlock activity grows.</p>
          )}
        </div>

        <div className="card">
          <h3>Status flow</h3>
          <div className="stack-list" style={{ gap: 10 }}>
            <p className="muted" style={{ margin: 0 }}><strong>Pending:</strong> amount has already been reserved from the producer wallet.</p>
            <p className="muted" style={{ margin: 0 }}><strong>Approved:</strong> request stays deducted and waits for actual payout processing.</p>
            <p className="muted" style={{ margin: 0 }}><strong>Paid:</strong> request remains deducted and appears as completed in producer history.</p>
            <p className="muted" style={{ margin: 0 }}><strong>Rejected:</strong> amount is restored once to the producer wallet and stored in history.</p>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
