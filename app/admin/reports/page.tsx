import Link from 'next/link';
import { headers } from 'next/headers';
import AdminReportPrintButton from '@/components/AdminReportPrintButton';
import AdminReportRecordsPanel from '@/components/AdminReportRecordsPanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { requireAdminUser } from '@/lib/auth-page';
import { getAdminNavItems } from '@/lib/admin-nav';
import {
  getAdminMonthlyReportData,
  getRecentReportStatements,
  getStoredReportStatement
} from '@/lib/admin-reports';
import { formatNaira } from '@/lib/format';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

type MonthlyReportSnapshot = Awaited<ReturnType<typeof getAdminMonthlyReportData>>;

type AdminReportsPageProps = {
  searchParams?: {
    month?: string | string[];
    videoId?: string | string[];
    statementId?: string | string[];
  };
};

function asArray(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asString(value?: string | string[]) {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function printDateLabel(date: Date | string | null | undefined) {
  const parsedDate = toDate(date);
  if (!parsedDate) return 'Not recorded';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parsedDate);
}

function hydrateStoredReport(statementData: unknown): MonthlyReportSnapshot | null {
  if (!statementData || typeof statementData !== 'object') {
    return null;
  }

  const snapshot = statementData as MonthlyReportSnapshot;
  if (!Array.isArray(snapshot.videos) || !Array.isArray(snapshot.availableVideos) || !snapshot.summary) {
    return null;
  }

  return {
    ...snapshot,
    periodStart: toDate(snapshot.periodStart) ?? new Date(),
    periodEnd: toDate(snapshot.periodEnd) ?? new Date(),
    generatedAt: toDate(snapshot.generatedAt) ?? new Date(),
    videos: snapshot.videos.map((video) => ({
      ...video,
      latestContract: video.latestContract
        ? {
            ...video.latestContract,
            effectiveDate: toDate(video.latestContract.effectiveDate),
            producerSignedAt: toDate(video.latestContract.producerSignedAt)
          }
        : null
    })),
    summary: {
      ...snapshot.summary,
      paymentDetails: {
        ...snapshot.summary.paymentDetails,
        remittanceDate: toDate(snapshot.summary.paymentDetails.remittanceDate)
      }
    }
  } as MonthlyReportSnapshot;
}

function statementStatusTone(status: string) {
  if (status === 'PAID' || status === 'ISSUED') return 'status-live';
  if (status === 'SUPERSEDED') return 'status-warn';
  return 'status-review';
}

function statementStatusLabel(status?: string | null) {
  return status ?? 'PREVIEW';
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireAdminUser('/admin/reports');
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;
  const requestedStatementId = asString(searchParams?.statementId);
  let previewReport: MonthlyReportSnapshot;
  let recentStatements: Awaited<ReturnType<typeof getRecentReportStatements>> = [];
  let storedStatement: Awaited<ReturnType<typeof getStoredReportStatement>> = null;
  let loadError: string | null = null;

  try {
    [previewReport, recentStatements, storedStatement] = await Promise.all([
      getAdminMonthlyReportData({
        monthKey: searchParams?.month,
        requestedVideoIds: asArray(searchParams?.videoId)
      }),
      getRecentReportStatements(),
      requestedStatementId ? getStoredReportStatement(requestedStatementId) : Promise.resolve(null)
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'The report data could not be loaded for this environment.';

    return (
      <DashboardShell
        title="Investor reports"
        description="Select one or more movies, build a clean monthly sales brief, and print the result as a polished PDF for investor or licensing conversations."
        sideNav={
          <SideNav
            active="/admin/reports"
            items={getAdminNavItems()}
          />
        }
        actions={
          <div className="action-list reports-toolbar no-print">
            <Link className="btn btn-ghost" href="/admin/finance">Finance console</Link>
            <Link className="btn btn-ghost" href="/admin/payments">Payouts</Link>
          </div>
        }
      >
        <div className="card">
          <span className="pill">Report loading issue</span>
          <h3>Production data needs one more hardening step</h3>
          <p className="muted">
            {loadError}
          </p>
          <p className="muted">
            This page now fails safely instead of throwing a server exception. The next fix is to align the production database with the current reporting schema or deploy the new fallback-safe code if the latest build is not live yet.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const storedReport = storedStatement ? hydrateStoredReport(storedStatement.statementData) : null;
  const report = storedReport ?? previewReport;
  const activeStatement = storedStatement && storedReport ? storedStatement : null;
  const statementStatus = statementStatusLabel(activeStatement?.status);
  const periodEndLabel = printDateLabel(new Date(report.periodEnd.getTime() - 24 * 60 * 60 * 1000));
  const topDeviceTypeLabel = report.summary.topDeviceType ?? 'Not captured in current telemetry';
  const totalTaxNaira = report.videos
    .map((video) => video.taxNaira)
    .reduce((total, value) => total + value, 0);
  const paymentDetails = report.summary.paymentDetails;
  const remittanceLabel = paymentDetails.remittanceDate
    ? printDateLabel(paymentDetails.remittanceDate)
    : activeStatement?.status === 'PAID'
      ? printDateLabel(activeStatement.paidAt)
      : 'Not remitted in this statement lifecycle';
  const bankNameLabel = paymentDetails.bankName ?? 'Not recorded on creator payout profile';
  const accountNameLabel = paymentDetails.accountName ?? 'Not recorded on creator payout profile';
  const accountNumberLabel = paymentDetails.accountNumber ?? 'Not recorded on creator payout profile';
  const swiftLabel = paymentDetails.swiftOrRouting ?? 'Not stored for the current payout route';
  const reviewLabel = activeStatement?.reviewedBy
    ? `${activeStatement.reviewedBy} | ${printDateLabel(activeStatement.reviewedAt)}`
    : activeStatement
      ? 'Not yet reviewed'
      : 'Preview only';
  const approvalLabel = activeStatement?.approvedBy
    ? `${activeStatement.approvedBy} | ${printDateLabel(activeStatement.approvedAt)}`
    : activeStatement
      ? 'Not yet approved'
      : 'Preview only';
  const issuedByLabel = activeStatement?.issuedBy
    ? `${activeStatement.issuedBy} | ${printDateLabel(activeStatement.issuedAt)}`
    : activeStatement
      ? 'Not yet issued'
      : 'Preview only';
  const paidByLabel = activeStatement?.paidBy
    ? `${activeStatement.paidBy} | ${printDateLabel(activeStatement.paidAt)}`
    : activeStatement
      ? 'Not yet marked as paid'
      : 'Preview only';

  return (
    <DashboardShell
      title="Investor reports"
      description="Select one or more movies, build a clean monthly sales brief, and print the result as a polished PDF for investor or licensing conversations."
      sideNav={
        <SideNav
          active="/admin/reports"
          items={getAdminNavItems({ pendingPayouts: report.pendingPayouts })}
        />
      }
      actions={
        <div className="action-list reports-toolbar no-print">
          <AdminReportPrintButton />
          <Link className="btn btn-ghost" href="/admin/finance">Finance console</Link>
          <Link className="btn btn-ghost" href="/admin/payments">Payouts</Link>
        </div>
      }
    >
      <div className="reports-page">
        <div className="card reports-control-panel no-print">
          <div className="reports-control-header">
            <div>
              <span className="pill">Monthly investor brief</span>
              <h3>Build a report for licensing and sales review</h3>
              <p className="muted">
                Choose the reporting month, tick the titles you want, then print this page to generate the PDF version.
              </p>
            </div>
            <div className="reports-meta-cluster">
              <div className="detail-card">
                <span className="detail-label">Current month</span>
                <strong>{report.monthLabel}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Selected titles</span>
                <strong>{report.selectedVideoIds.length}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Sales in view</span>
                <strong>{formatMoney(report.summary.grossNaira)}</strong>
              </div>
            </div>
          </div>

          <form method="GET" action="/admin/reports" className="reports-filter-form">
            <div className="reports-filter-grid">
              <label className="field">
                <span className="field-label">Reporting month</span>
                <input className="input" type="month" name="month" defaultValue={report.monthKey} />
                <span className="field-hint">The report summarizes unlock-settlement activity recorded during this calendar month.</span>
              </label>

              <div className="field">
                <span className="field-label">Movies to include</span>
                <div className="reports-selector-grid">
                  {report.availableVideos.length ? (
                    report.availableVideos.map((video) => (
                      <label key={video.id} className="reports-selector-card">
                        <input
                          type="checkbox"
                          name="videoId"
                          value={video.id}
                          defaultChecked={report.selectedVideoIds.includes(video.id)}
                        />
                        <div className="reports-selector-copy">
                          <div className="reports-selector-top">
                            <strong>{video.title}</strong>
                            <span className={`status-chip ${
                              video.status === 'APPROVED' ? 'status-live' : video.status === 'PENDING' ? 'status-review' : 'status-warn'
                            }`}>
                              {video.statusLabel}
                            </span>
                          </div>
                          <p className="muted">
                            {video.creatorName}
                            {video.creatorNumber ? ` | ${video.creatorNumber}` : ''}
                          </p>
                          <div className="detail-badges detail-badges-compact">
                            <span className="badge">{video.rightsLabel}</span>
                            <span className="badge">{video.priceLabel}</span>
                            <span className="badge">{video.category}</span>
                            {video.releaseYear ? <span className="badge">{video.releaseYear}</span> : null}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="muted">Movies will appear here after they have been created in the catalog.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Generate report</button>
              <span className="muted">Tip: after previewing the layout, use the print button and choose &quot;Save as PDF&quot;.</span>
            </div>
          </form>
        </div>

        {requestedStatementId && !activeStatement ? (
          <div className="card no-print">
            <p className="muted">The requested statement record was not found, so this page is showing a live preview for the current filters instead.</p>
          </div>
        ) : null}

        <AdminReportRecordsPanel
          monthKey={report.monthKey}
          selectedVideoIds={report.selectedVideoIds}
          recentStatements={recentStatements.map((statement) => ({
            ...statement,
            createdAt: statement.createdAt.toISOString(),
            updatedAt: statement.updatedAt.toISOString()
          }))}
          activeStatementId={activeStatement?.id ?? null}
          amountFormatter={formatMoney}
        />

        {report.videos.length ? (
          <div className="reports-print-shell" id="monthly-report-sheet">
            <section className="report-cover report-print-block">
              <div className="report-cover-copy">
                <span className="report-eyebrow">ACE investor reporting desk</span>
                <h2>{report.monthLabel} performance and licensing brief</h2>
                <p>
                  A monthly commercial summary for selected catalog titles, combining unlock sales, payout visibility, viewer completion signal, and rights-readiness notes.
                </p>
                <div className="detail-badges detail-badges-compact">
                  <span className={`status-chip ${statementStatusTone(statementStatus)}`}>
                    {statementStatus}
                  </span>
                  {activeStatement ? <span className="badge">{activeStatement.reportCode}</span> : <span className="badge">Live preview</span>}
                  <span className="badge">{report.summary.statementVersion}</span>
                </div>
              </div>
              <div className="report-cover-side">
                <div className="report-cover-card">
                  <span className="detail-label">Reporting entity</span>
                  <strong>{report.summary.reportingEntity}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Statement code</span>
                  <strong>{activeStatement?.reportCode ?? report.summary.reportId}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Workflow status</span>
                  <strong>{statementStatus}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Title / package</span>
                  <strong>{report.summary.titleCount > 1 ? `${report.summary.titleCount} selected titles package` : report.videos[0]?.title ?? 'No title selected'}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Report period</span>
                  <strong>{printDateLabel(report.periodStart)} to {periodEndLabel}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Rights covered</span>
                  <strong>{
                    report.summary.exclusiveCount === report.summary.titleCount
                      ? 'Exclusive rights package'
                      : report.summary.exclusiveCount > 0
                        ? 'Mixed shared and exclusive rights'
                        : 'Shared rights package'
                  }</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Prepared / created</span>
                  <strong>{report.summary.preparedBy} | {printDateLabel(activeStatement?.createdAt ?? report.generatedAt)}</strong>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Portfolio snapshot</span>
                  <h3>{report.summary.titleCount} selected titles in review</h3>
                </div>
                <p className="report-sheet-note">
                  Sales values reflect unlock settlement records. Rights notes reflect the latest contract attached to each selected movie.
                </p>
              </div>

              <div className="report-summary-grid">
                <div className="report-summary-card">
                  <span className="detail-label">Gross sales</span>
                  <strong>{formatMoney(report.summary.grossNaira)}</strong>
                  <span className={report.summary.grossDeltaPercent >= 0 ? 'trend-up' : 'status-warn'}>
                    {report.summary.grossDeltaPercent >= 0 ? '+' : ''}{report.summary.grossDeltaPercent}% vs {report.previousMonthLabel}
                  </span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Total unlocks</span>
                  <strong>{report.summary.unlockCount}</strong>
                  <span className="muted">Viewer purchases across selected titles</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Creator share</span>
                  <strong>{formatMoney(report.summary.creatorNaira)}</strong>
                  <span className="muted">Booked to producers from monthly sales</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Platform net</span>
                  <strong>{formatMoney(report.summary.platformNetNaira)}</strong>
                  <span className="muted">Net commission after fees and tax</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Completion rate</span>
                  <strong>{report.summary.completionRate}%</strong>
                  <span className="muted">Of this month&apos;s unlock cohort</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Average sale value</span>
                  <strong>{formatMoney(report.summary.averageRevenuePerUnlockNaira)}</strong>
                  <span className="muted">Gross value per unlock</span>
                </div>
              </div>

              <div className="report-summary-strip">
                <div>
                  <span className="detail-label">Contract-ready titles</span>
                  <strong>{report.summary.contractReadyCount}/{report.summary.titleCount}</strong>
                </div>
                <div>
                  <span className="detail-label">Exclusive licenses</span>
                  <strong>{report.summary.exclusiveCount}</strong>
                </div>
                <div>
                  <span className="detail-label">Top earner</span>
                  <strong>{report.summary.topTitle ? `${report.summary.topTitle.title} | ${formatMoney(report.summary.topTitle.grossNaira)}` : 'No sales recorded'}</strong>
                </div>
                <div>
                  <span className="detail-label">NGN ledger view</span>
                  <strong>{formatNaira(report.summary.grossNaira)}</strong>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Input summary</span>
                  <h3>Royalty statement inputs</h3>
                </div>
                <p className="report-sheet-note">
                  This block mirrors the commercial statement fields from your sample template using ACE ledger values and explicit source-status records where telemetry is not yet segmented.
                </p>
              </div>

              <div className="report-summary-grid">
                <div className="report-summary-card">
                  <span className="detail-label">Gross SVOD revenue</span>
                  <strong>{formatMoney(report.summary.grossNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Royalty base / pool</span>
                  <strong>{formatMoney(report.summary.netRevenueNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Approved deductions</span>
                  <strong>{formatMoney(report.summary.approvedDeductionsNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Licensor share %</span>
                  <strong>{report.summary.licensorSharePercent}%</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Platform / ACE share %</span>
                  <strong>{report.summary.platformSharePercent}%</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Current amount due</span>
                  <strong>{formatMoney(report.summary.currentAmountDueNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Opening balance</span>
                  <strong>{formatMoney(report.summary.openingBalanceNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Closing balance</span>
                  <strong>{formatMoney(report.summary.closingBalanceNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Amount previously paid</span>
                  <strong>{formatMoney(report.summary.amountPreviouslyPaidNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Tax / withholding</span>
                  <strong>{formatMoney(totalTaxNaira)}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Exchange rate used</span>
                  <strong>{report.summary.exchangeRateLabel}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Payment due date</span>
                  <strong>{report.summary.paymentDueLabel}</strong>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Title-level statement</span>
                  <h3>Partner-facing performance table</h3>
                </div>
                <p className="report-sheet-note">
                  Territory rows are derived from billing-currency markets because per-country stream territory is not yet stored in the statement ledger.
                </p>
              </div>

              <div className="table-wrap">
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Territory</th>
                      <th>Period</th>
                      <th>Views</th>
                      <th>Watch hours</th>
                      <th>Revenue base</th>
                      <th>Share %</th>
                      <th>Amount due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.videos.map((video) => (
                      <tr key={video.id}>
                        <td>{video.title}</td>
                        <td>{video.topTerritory}</td>
                        <td>{report.monthLabel}</td>
                        <td>{video.uniqueAccounts}</td>
                        <td>{video.watchHours.toFixed(1)}</td>
                        <td>{formatMoney(video.netRevenueNaira)}</td>
                        <td>{video.licensorSharePercent}%</td>
                        <td>{formatMoney(video.creatorNaira)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Performance snapshot</span>
                  <h3>Usage and operational health</h3>
                </div>
                <p className="report-sheet-note">
                  The original template asks for controls and source-of-truth visibility, so these KPIs are paired with platform-aware notes instead of silent assumptions.
                </p>
              </div>

              <div className="report-summary-grid">
                <div className="report-summary-card">
                  <span className="detail-label">Unique viewers</span>
                  <strong>{report.summary.uniqueAccounts}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Completion rate</span>
                  <strong>{report.summary.completionRate}%</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Average watch time</span>
                  <strong>{report.summary.watchHours > 0 && report.summary.uniqueAccounts > 0 ? `${(report.summary.watchHours / report.summary.uniqueAccounts).toFixed(2)} hrs/account` : '0.00 hrs/account'}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Active territories</span>
                  <strong>{report.summary.activeTerritories}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Top territory</span>
                  <strong>{report.summary.topTerritory}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Top device type</span>
                  <strong>{topDeviceTypeLabel}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Promotional adjustments</span>
                  <strong>{report.summary.promotionalAdjustmentsLabel}</strong>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Content status</span>
                  <strong>{report.summary.contentStatus}</strong>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Reconciliation</span>
                  <h3>Statement movement</h3>
                </div>
                <p className="report-sheet-note">
                  This mirrors the reconciliation schedule in your template so finance and partner teams can track how the payable figure is derived.
                </p>
              </div>

              <div className="table-wrap">
                <table className="table report-table">
                  <thead>
                    <tr>
                      <th>Line item</th>
                      <th>Basis</th>
                      <th>Debit</th>
                      <th>Credit</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Opening balance</td>
                      <td>Prior licensed earnings less paid creator withdrawals before {report.monthLabel}</td>
                      <td>-</td>
                      <td>{formatMoney(report.summary.openingBalanceNaira)}</td>
                      <td>{formatMoney(report.summary.openingBalanceNaira)}</td>
                    </tr>
                    <tr>
                      <td>Gross SVOD revenue</td>
                      <td>Monthly unlock settlement ledger</td>
                      <td>-</td>
                      <td>{formatMoney(report.summary.grossNaira)}</td>
                      <td>{formatMoney(report.summary.openingBalanceNaira + report.summary.grossNaira)}</td>
                    </tr>
                    <tr>
                      <td>Approved deductions</td>
                      <td>Gateway, tax, and referral deductions</td>
                      <td>{formatMoney(report.summary.approvedDeductionsNaira)}</td>
                      <td>-</td>
                      <td>{formatMoney(report.summary.openingBalanceNaira + report.summary.netRevenueNaira)}</td>
                    </tr>
                    <tr>
                      <td>Licensor share allocation</td>
                      <td>{report.summary.licensorSharePercent}% of approved base</td>
                      <td>-</td>
                      <td>{formatMoney(report.summary.creatorNaira)}</td>
                      <td>{formatMoney(report.summary.openingBalanceNaira + report.summary.creatorNaira)}</td>
                    </tr>
                    <tr>
                      <td>Amount previously paid</td>
                      <td>Paid creator payout requests linked to selected licensors</td>
                      <td>{formatMoney(report.summary.amountPreviouslyPaidNaira)}</td>
                      <td>-</td>
                      <td>{formatMoney(report.summary.closingBalanceNaira)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Documentation</span>
                  <h3>Metric definitions and control notes</h3>
                </div>
                <p className="report-sheet-note">
                  The original ACE Naija template emphasizes traceability, fixed definitions, and visible controls. This section makes those assumptions explicit in the generated statement.
                </p>
              </div>

              <div className="report-two-column">
                <div className="report-panel">
                  <h4>Source of truth</h4>
                  <div className="stack-list">
                    <div className="stack-row">
                      <strong>Revenue basis</strong>
                      <span className="muted">unlockSettlement ledger</span>
                    </div>
                    <div className="stack-row">
                      <strong>Watch progression</strong>
                      <span className="muted">watchHistory cohort rows</span>
                    </div>
                    <div className="stack-row">
                      <strong>Rights posture</strong>
                      <span className="muted">Latest contract record per title</span>
                    </div>
                    <div className="stack-row">
                      <strong>Payout history</strong>
                      <span className="muted">creator payout paid records</span>
                    </div>
                  </div>
                </div>

                <div className="report-panel">
                  <h4>Generated notes</h4>
                  <div className="stack-list">
                    <p className="report-note">Territory labels are derived from billing-currency markets because per-country playback territory is not yet stored in the statement ledger.</p>
                    <p className="report-note">Top device type is recorded with a source-status flag and remains unavailable until device telemetry is captured in the revenue statement record.</p>
                    <p className="report-note">Where no manual correction, refund, or promotional adjustment exists in the current schema, the statement records that explicitly rather than inventing a number.</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-two-column">
                <div className="report-panel">
                  <h4>Payment details</h4>
                  <div className="report-mini-grid">
                    <div>
                      <span className="detail-label">Beneficiary</span>
                      <strong>{paymentDetails.beneficiary}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Bank</span>
                      <strong>{bankNameLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Account name</span>
                      <strong>{accountNameLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Account no.</span>
                      <strong>{accountNumberLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">SWIFT / routing</span>
                      <strong>{swiftLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Payment ref.</span>
                      <strong>{paymentDetails.paymentReference}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Remittance date</span>
                      <strong>{remittanceLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Amount remitted</span>
                      <strong>{formatMoney(paymentDetails.amountRemittedNaira)}</strong>
                    </div>
                  </div>
                </div>

                <div className="report-panel">
                  <h4>Certification and controls</h4>
                  <p className="report-note">
                    We certify that this statement was prepared from ACE operational and finance records for the reporting period shown above, using consistent definitions and internal review controls.
                  </p>
                  <div className="report-mini-grid">
                    <div>
                      <span className="detail-label">Prepared by</span>
                      <strong>{report.summary.preparedBy}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Reviewed by</span>
                      <strong>{reviewLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Approved by</span>
                      <strong>{approvalLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Issued by</span>
                      <strong>{issuedByLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Paid by</span>
                      <strong>{paidByLabel}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Statement created</span>
                      <strong>{printDateLabel(activeStatement?.createdAt ?? report.generatedAt)}</strong>
                    </div>
                  </div>
                  <p className="report-note report-note-compact">
                    Supporting documents: settlement ledger, title statement export, payout history, contract snapshot, and derived methodology notes.
                  </p>
                  {activeStatement?.notes ? <p className="report-note report-note-compact">Statement notes: {activeStatement.notes}</p> : null}
                </div>
              </div>
            </section>

            {report.videos.map((video, index) => (
              <section key={video.id} className="report-sheet report-print-block">
                <div className="report-title-row">
                  <div>
                    <span className="report-eyebrow">Title {index + 1}</span>
                    <h3>{video.title}</h3>
                    <p className="report-title-meta">
                      {video.creatorName}
                      {video.creatorNumber ? ` | ${video.creatorNumber}` : ''}
                      {video.creatorVerified ? ' | verified producer' : ''}
                    </p>
                  </div>
                  <div className="detail-badges">
                    <span className="badge">{video.statusLabel}</span>
                    <span className="badge">{video.rightsLabel}</span>
                    <span className="badge">{video.priceLabel}</span>
                    <span className="badge">{video.runtimeLabel}</span>
                  </div>
                </div>

                <div className="report-detail-grid">
                  <div className="report-detail-card">
                    <span className="detail-label">Monthly unlocks</span>
                    <strong>{video.unlockCount}</strong>
                    <span className={video.unlockDeltaPercent >= 0 ? 'trend-up' : 'status-warn'}>
                      {video.unlockDeltaPercent >= 0 ? '+' : ''}{video.unlockDeltaPercent}% vs {report.previousMonthLabel}
                    </span>
                  </div>
                  <div className="report-detail-card">
                    <span className="detail-label">Gross sales</span>
                    <strong>{formatMoney(video.grossNaira)}</strong>
                    <span className="muted">{formatNaira(video.grossNaira)} ledger value</span>
                  </div>
                  <div className="report-detail-card">
                    <span className="detail-label">Producer earnings</span>
                    <strong>{formatMoney(video.creatorNaira)}</strong>
                    <span className="muted">Monthly creator allocation</span>
                  </div>
                  <div className="report-detail-card">
                    <span className="detail-label">Platform net</span>
                    <strong>{formatMoney(video.platformNetNaira)}</strong>
                    <span className="muted">After deductions</span>
                  </div>
                  <div className="report-detail-card">
                    <span className="detail-label">Completion rate</span>
                    <strong>{video.completionRate}%</strong>
                    <span className="muted">{video.completionCount} completed viewers</span>
                  </div>
                  <div className="report-detail-card">
                    <span className="detail-label">Average watch-through</span>
                    <strong>{video.averageWatchPercent}%</strong>
                    <span className="muted">{video.fullMovieStarters} viewers moved beyond teaser</span>
                  </div>
                </div>

                <div className="report-two-column">
                  <div className="report-panel">
                    <h4>Sales mix and deductions</h4>
                    <div className="report-mini-grid">
                      <div>
                        <span className="detail-label">Average sale</span>
                        <strong>{formatMoney(video.averageRevenuePerUnlockNaira)}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Gateway fees</span>
                        <strong>{formatMoney(video.gatewayFeeNaira)}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Tax booked</span>
                        <strong>{formatMoney(video.taxNaira)}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Referral payout</span>
                        <strong>{formatMoney(video.referralNaira)}</strong>
                      </div>
                    </div>
                    <div className="detail-badges" style={{ marginTop: 16 }}>
                      {video.sourceBreakdown.length ? (
                        video.sourceBreakdown.map((source) => (
                          <span key={source.source} className="badge">{source.label}: {source.count}</span>
                        ))
                      ) : (
                        <span className="badge">No unlock source activity this month</span>
                      )}
                    </div>
                  </div>

                  <div className="report-panel">
                    <h4>Licensing posture</h4>
                    <div className="report-mini-grid">
                      <div>
                        <span className="detail-label">Rights tier</span>
                        <strong>{video.rightsLabel}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Catalog state</span>
                        <strong>{video.statusLabel}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Category</span>
                        <strong>{video.category}</strong>
                      </div>
                      <div>
                        <span className="detail-label">Release year</span>
                        <strong>{video.releaseYear ?? 'Not set'}</strong>
                      </div>
                    </div>
                    <p className="report-note">{video.availabilityNote}</p>
                    {video.latestContract ? (
                      <p className="report-note report-note-compact">
                        Signed by {video.latestContract.signedBy}
                        {video.latestContract.effectiveDate ? ` | effective ${printDateLabel(video.latestContract.effectiveDate)}` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="report-panel">
                  <h4>Peak days this month</h4>
                  {video.dailyPerformance.length ? (
                    <div className="report-activity-list">
                      {video.dailyPerformance.slice(0, 5).map((day) => (
                        <div key={`${video.id}-${day.label}`} className="report-activity-row">
                          <div>
                            <strong>{day.label}</strong>
                            <p className="muted">{day.unlockCount} unlocks</p>
                          </div>
                          <span>{formatMoney(day.grossNaira)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="report-note">No settlement activity was recorded for this title within {report.monthLabel}.</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="card">
            <h3>No titles selected yet</h3>
            <p className="muted">Choose at least one movie above to generate the monthly investor report preview.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
