import Link from 'next/link';
import type { Gateway, PaymentStatus, Prisma } from '@prisma/client';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { formatRecordedCharge } from '@/lib/format';

export const dynamic = 'force-dynamic';

type SearchParams = {
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
  status?: string | string[];
  gateway?: string | string[];
  type?: string | string[];
  q?: string | string[];
  group?: string | string[];
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return endOfDay ? addUtcDays(date, 1) : date;
}

function getDateRange(period: string, from?: string, to?: string) {
  const today = startOfUtcDay(new Date());
  if (period === 'today') return { gte: today, lt: addUtcDays(today, 1) };
  if (period === '7d') return { gte: addUtcDays(today, -6), lt: addUtcDays(today, 1) };
  if (period === 'all') return null;
  if (period === 'custom') {
    const gte = parseDate(from);
    const lt = parseDate(to, true);
    return gte || lt ? { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) } : null;
  }
  return {
    gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    lt: addUtcDays(today, 1)
  };
}

function paymentType(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'Wallet top-up';
  const type = typeof metadata.type === 'string' ? metadata.type : 'topup';
  if (type === 'pass') return 'Hybrid pass';
  if (type === 'family') return 'Family bundle';
  return 'Wallet top-up';
}

function statusTone(status: PaymentStatus) {
  if (status === 'SUCCESS') return 'status-live';
  if (status === 'PENDING') return 'status-review';
  return 'status-warn';
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lagos'
  }).format(date);
}

function groupKey(date: Date, group: string) {
  if (group === 'month') return date.toISOString().slice(0, 7);
  return date.toISOString().slice(0, 10);
}

function groupLabel(key: string, group: string) {
  const date = new Date(`${group === 'month' ? `${key}-01` : key}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en-NG', {
    month: group === 'month' ? 'long' : 'short',
    day: group === 'month' ? undefined : 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

export default async function AdminTransactionsPage({ searchParams }: { searchParams?: SearchParams }) {
  await requireAdminUser('/admin/transactions');

  const period = first(searchParams?.period) ?? 'month';
  const selectedStatus = first(searchParams?.status) ?? 'ALL';
  const selectedGateway = first(searchParams?.gateway) ?? 'ALL';
  const selectedType = first(searchParams?.type) ?? 'ALL';
  const query = first(searchParams?.q)?.trim() ?? '';
  const group = first(searchParams?.group) === 'month' ? 'month' : 'day';
  const dateRange = getDateRange(period, first(searchParams?.from), first(searchParams?.to));

  const baseWhere: Prisma.PaymentWhereInput = {
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(selectedGateway !== 'ALL' ? { gateway: selectedGateway as Gateway } : {}),
    ...(selectedType !== 'ALL' ? { metadata: { path: ['type'], equals: selectedType } } : {}),
    ...(query
      ? {
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { user: { email: { contains: query, mode: 'insensitive' } } },
            { user: { name: { contains: query, mode: 'insensitive' } } }
          ]
        }
      : {})
  };
  const recordsWhere: Prisma.PaymentWhereInput = {
    ...baseWhere,
    ...(selectedStatus !== 'ALL' ? { status: selectedStatus as PaymentStatus } : {})
  };

  const [records, timelineRecords, statusTotals, pendingPayouts] = await Promise.all([
    prisma.payment.findMany({
      where: recordsWhere,
      orderBy: { createdAt: 'desc' },
      take: 250,
      include: { user: { select: { name: true, email: true } } }
    }),
    prisma.payment.findMany({
      where: baseWhere,
      orderBy: { createdAt: 'asc' },
      take: 5000,
      select: { createdAt: true, status: true, amountNaira: true }
    }),
    prisma.payment.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { _all: true },
      _sum: { amountNaira: true }
    }),
    prisma.creatorPayoutRequest.count({ where: { status: 'PENDING' } })
  ]);

  const totals = new Map(statusTotals.map((row) => [row.status, row]));
  const success = totals.get('SUCCESS');
  const grouped = new Map<string, { total: number; success: number; failed: number; abandoned: number; pending: number; volume: number }>();
  for (const payment of timelineRecords) {
    const key = groupKey(payment.createdAt, group);
    const row = grouped.get(key) ?? { total: 0, success: 0, failed: 0, abandoned: 0, pending: 0, volume: 0 };
    row.total += 1;
    if (payment.status === 'SUCCESS') {
      row.success += 1;
      row.volume += payment.amountNaira;
    } else if (payment.status === 'FAILED') row.failed += 1;
    else if (payment.status === 'ABANDONED') row.abandoned += 1;
    else if (payment.status === 'PENDING') row.pending += 1;
    grouped.set(key, row);
  }

  const groupedRows = Array.from(grouped.entries()).reverse().slice(0, 31);

  return (
    <DashboardShell
      title="Customer transactions"
      description="Monitor every wallet funding attempt, payment outcome, and credited entitlement from one operational ledger."
      sideNav={<SideNav active="/admin/transactions" items={getAdminNavItems({ pendingPayouts })} />}
      actions={
        <div className="action-list">
          <Link className="btn btn-ghost" href="/admin/payments">Producer payouts</Link>
          <Link className="btn btn-ghost" href="/admin/support">Support inbox</Link>
        </div>
      }
    >
      <div className="metric-grid">
        {[
          ['Successful', success?._count._all ?? 0, success?._sum.amountNaira ?? 0, 'status-live'],
          ['Pending', totals.get('PENDING')?._count._all ?? 0, 0, 'status-review'],
          ['Failed', totals.get('FAILED')?._count._all ?? 0, 0, 'status-warn'],
          ['Abandoned', totals.get('ABANDONED')?._count._all ?? 0, 0, 'status-warn']
        ].map(([label, count, volume, tone]) => (
          <div className="metric-card" key={String(label)}>
            <span className="muted">{label}</span>
            <strong>{Number(count).toLocaleString()}</strong>
            <span className={String(tone)}>
              {Number(volume) > 0 ? `${formatRecordedCharge({ amountMinor: Number(volume) * 100, amountNaira: Number(volume), currency: 'NGN' })} received` : 'Payment attempts'}
            </span>
          </div>
        ))}
      </div>

      <form method="GET" className="card" style={{ marginTop: 20 }}>
        <div className="reports-filter-grid">
          <label className="field">
            <span className="field-label">Period</span>
            <select className="input" name="period" defaultValue={period}>
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          <label className="field"><span className="field-label">From</span><input className="input" type="date" name="from" defaultValue={first(searchParams?.from)} /></label>
          <label className="field"><span className="field-label">To</span><input className="input" type="date" name="to" defaultValue={first(searchParams?.to)} /></label>
          <label className="field">
            <span className="field-label">Status</span>
            <select className="input" name="status" defaultValue={selectedStatus}>
              <option value="ALL">All statuses</option>
              <option value="SUCCESS">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="ABANDONED">Abandoned</option>
              <option value="REFUNDED">Refunded</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Gateway</span>
            <select className="input" name="gateway" defaultValue={selectedGateway}>
              <option value="ALL">All gateways</option>
              <option value="PAYSTACK">Paystack</option>
              <option value="STRIPE">Stripe</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Transaction type</span>
            <select className="input" name="type" defaultValue={selectedType}>
              <option value="ALL">All types</option>
              <option value="topup">Wallet top-up</option>
              <option value="pass">Hybrid pass</option>
              <option value="family">Family bundle</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Search</span>
            <input className="input" name="q" defaultValue={query} placeholder="Email, name, or reference" />
          </label>
          <label className="field">
            <span className="field-label">Summary grouping</span>
            <select className="input" name="group" defaultValue={group}>
              <option value="day">By day</option>
              <option value="month">By month</option>
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">Apply filters</button>
          <Link className="btn btn-ghost" href="/admin/transactions">Reset</Link>
        </div>
      </form>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>{group === 'month' ? 'Monthly' : 'Daily'} activity</h3>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Period</th><th>Attempts</th><th>Success</th><th>Failed</th><th>Abandoned</th><th>Pending</th><th>Successful volume</th></tr></thead>
            <tbody>
              {groupedRows.length ? groupedRows.map(([key, row]) => (
                <tr key={key}>
                  <td><strong>{groupLabel(key, group)}</strong></td>
                  <td>{row.total}</td><td>{row.success}</td><td>{row.failed}</td><td>{row.abandoned}</td><td>{row.pending}</td>
                  <td>{formatRecordedCharge({ amountMinor: row.volume * 100, amountNaira: row.volume, currency: 'NGN' })}</td>
                </tr>
              )) : <tr><td colSpan={7}>No transactions match this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="transactions-header">
          <div><h3 style={{ marginBottom: 4 }}>Transaction ledger</h3><p className="muted" style={{ margin: 0 }}>Showing up to 250 newest matching records.</p></div>
          <span className="badge">{records.length} shown</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Wallet credit</th><th>Reference</th></tr></thead>
            <tbody>
              {records.length ? records.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDateTime(payment.createdAt)}</td>
                  <td><strong>{payment.user.name || 'Unnamed user'}</strong><div className="muted">{payment.user.email}</div></td>
                  <td>{paymentType(payment.metadata)}</td>
                  <td>{formatRecordedCharge({ amountMinor: payment.amountMinor ?? payment.amountNaira * 100, amountNaira: payment.amountNaira, currency: payment.currency })}</td>
                  <td>{payment.gateway}</td>
                  <td><span className={`status-chip ${statusTone(payment.status)}`}>{payment.status}</span></td>
                  <td>{payment.entitlementAppliedAt ? formatDateTime(payment.entitlementAppliedAt) : 'Not credited'}</td>
                  <td><code>{payment.reference}</code></td>
                </tr>
              )) : <tr><td colSpan={8}>No transactions match the selected filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
