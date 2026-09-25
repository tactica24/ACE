import Link from 'next/link';
import { headers } from 'next/headers';
import AdminReportPrintButton from '@/components/AdminReportPrintButton';
import AdminReportRecordsPanel from '@/components/AdminReportRecordsPanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { getAdminProducerMonthlyReportData, getRecentReportStatements } from '@/lib/admin-reports';
import { requireAdminUser } from '@/lib/auth-page';
import { getChargeForNaira, getRegionalMoneyDisplay } from '@/lib/pricing';
import { formatRecordedCharge } from '@/lib/format';

export const dynamic = 'force-dynamic';

type AdminReportsPageProps = {
  searchParams?: {
    month?: string | string[];
    producer?: string | string[];
    statementId?: string | string[];
  };
};

function asString(value?: string | string[]) {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

function formatPrintDate(date: Date | null | undefined) {
  if (!date) {
    return 'Not recorded';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date);
}

function formatPercent(value: number) {
  return `${Math.round(value * 10) / 10}%`;
}

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireAdminUser('/admin/reports');

  const requestHeaders = await headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

  let loadError: string | null = null;
  let producerOptions: Array<{
    key: string;
    producerId: string | null;
    displayName: string;
    creatorNumber: string | null;
    verified: boolean;
    videoCount: number;
    approvedVideoCount: number;
    latestCreatedAt: Date | null;
  }> = [];
  let selectedProducer: {
    key: string;
    producerId: string | null;
    displayName: string;
    creatorNumber: string | null;
    verified: boolean;
    videoCount: number;
    approvedVideoCount: number;
    latestCreatedAt: Date | null;
  } | null = null;
  let report: Awaited<ReturnType<typeof getAdminProducerMonthlyReportData>>['report'] | null = null;
let recentStatements: Array<{
    id: string;
    reportCode: string;
    status: string;
    monthKey: string;
    rightsHolder: string;
    titleCount: number;
    currentAmountDueNaira: number;
    formattedCurrentDue: string;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const activeStatementId = asString(searchParams?.statementId);

  try {
    const data = await getAdminProducerMonthlyReportData({
      monthKey: searchParams?.month,
      producerKey: searchParams?.producer
    });

    producerOptions = data.producerOptions;
    selectedProducer = data.selectedProducer;
    report = data.report;
    recentStatements = (
      await getRecentReportStatements()
    ).map((statement) => ({
      ...statement,
      formattedCurrentDue: formatMoney(statement.currentAmountDueNaira)
    }));
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'The report data could not be loaded.';
    recentStatements = []; // Provide fallback empty array
  }

  const pendingPayouts = report?.pendingPayouts ?? 0;
  const periodEndLabel = report
    ? formatPrintDate(new Date(report.periodEnd.getTime() - 24 * 60 * 60 * 1000))
    : 'Not recorded';

  return (
    <DashboardShell
      title="Reporting"
      description="Generate a producer-level monthly report, automatically include all associated titles, and print the finished statement as a PDF-ready document."
      sideNav={
        <SideNav
          active="/admin/reports"
          items={getAdminNavItems({ pendingPayouts })}
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
              <span className="pill">Producer reporting</span>
              <h3>Generate a monthly producer statement</h3>
              <p className="muted">
                Pick a producer, choose the reporting month, and ACE Studio will automatically include every title associated with that producer in the generated report.
              </p>
            </div>
            <div className="reports-meta-cluster">
              <div className="detail-card">
                <span className="detail-label">Selected producer</span>
                <strong>{selectedProducer?.displayName ?? 'No producer selected'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Reporting month</span>
                <strong>{report?.monthLabel ?? 'Not loaded'}</strong>
              </div>
              <div className="detail-card">
                <span className="detail-label">Included titles</span>
                <strong>{selectedProducer?.videoCount ?? 0}</strong>
              </div>
            </div>
          </div>

          <form method="GET" action="/admin/reports" className="reports-filter-form">
            <div className="reports-filter-grid">
              <label className="field">
                <span className="field-label">Producer</span>
                <select className="input" name="producer" defaultValue={selectedProducer?.key ?? producerOptions[0]?.key ?? ''}>
                  {producerOptions.length ? (
                    producerOptions.map((producer) => (
                      <option key={producer.key} value={producer.key}>
                        {producer.displayName}
                        {producer.creatorNumber ? ` | ${producer.creatorNumber}` : ''}
                        {` | ${producer.videoCount} title${producer.videoCount === 1 ? '' : 's'}`}
                      </option>
                    ))
                  ) : (
                    <option value="">No producer titles available yet</option>
                  )}
                </select>
                <span className="field-hint">Every title mapped to the selected producer will be included automatically.</span>
              </label>

              <label className="field">
                <span className="field-label">Reporting month</span>
                <input className="input" type="month" name="month" defaultValue={report?.monthKey} />
                <span className="field-hint">If there is no activity in that month, the report still renders with zero values instead of failing.</span>
              </label>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={!producerOptions.length}>
                Generate report
              </button>
              <AdminReportPrintButton label="Print or save PDF" />
              <span className="muted">After previewing the statement, use the print button and choose &quot;Save as PDF&quot;.</span>
            </div>
          </form>
        </div>

        {loadError ? (
          <div className="card no-print">
            <h3>Report data is unavailable right now</h3>
            <p className="muted">{loadError}</p>
          </div>
        ) : null}

        {!loadError && !producerOptions.length ? (
          <div className="card">
            <h3>No producer titles are available yet</h3>
            <p className="muted">Once a producer has at least one uploaded title in the catalog, this page will generate monthly reports automatically.</p>
          </div>
        ) : null}

        {!loadError && report && selectedProducer ? (
          <>
          {report.warning ? (
            <div className="card no-print">
              <h3>Report preview warning</h3>
              <p className="muted">{report.warning}</p>
            </div>
          ) : null}
        <AdminReportRecordsPanel
          monthKey={report.monthKey}
          selectedVideoIds={report.selectedVideoIds}
          recentStatements={recentStatements}
          activeStatementId={activeStatementId}
        />
          <div className="reports-print-shell" id="producer-report-sheet">
            <section className="report-cover report-print-block">
              <div className="report-cover-copy">
                <span className="report-eyebrow">ACE producer reporting desk</span>
                <h2>{selectedProducer.displayName} | {report.monthLabel} statement</h2>
                <p>
                  This report includes all titles currently associated with the selected producer and summarizes unlock activity, creator earnings, balances, and title-level performance for the reporting month.
                </p>
                <div className="detail-badges detail-badges-compact">
                  <span className="badge">{selectedProducer.verified ? 'Verified producer' : 'Producer record'}</span>
                  {selectedProducer.creatorNumber ? <span className="badge">{selectedProducer.creatorNumber}</span> : null}
                  <span className="badge">{selectedProducer.videoCount} title{selectedProducer.videoCount === 1 ? '' : 's'}</span>
                </div>
              </div>
              <div className="report-cover-side">
                <div className="report-cover-card">
                  <span className="detail-label">Period</span>
                  <strong>{formatPrintDate(report.periodStart)} to {periodEndLabel}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Included titles</span>
                  <strong>{selectedProducer.videoCount}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Approved titles</span>
                  <strong>{selectedProducer.approvedVideoCount}</strong>
                </div>
                <div className="report-cover-card">
                  <span className="detail-label">Latest title added</span>
                  <strong>{formatPrintDate(selectedProducer.latestCreatedAt)}</strong>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Summary</span>
                  <h3>Monthly commercial snapshot</h3>
                </div>
                <p className="report-sheet-note">
                  Zero activity is reported explicitly, so finance and producer ops can still issue a complete statement without needing a fallback spreadsheet.
                </p>
              </div>
              <div className="report-summary-grid">
                <div className="report-summary-card">
                  <span className="detail-label">Unlocks</span>
                  <strong>{report.summary.unlockCount}</strong>
                  <span className="muted">Across all included titles</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Gross income</span>
                  <strong>{formatMoney(report.summary.grossNaira)}</strong>
                  <span className="muted">Recorded for the selected month</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Producer share</span>
                  <strong>{formatMoney(report.summary.creatorNaira)}</strong>
                  <span className="muted">{formatPercent(report.summary.licensorSharePercent)} of gross</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Current due</span>
                  <strong>{formatMoney(report.summary.currentAmountDueNaira)}</strong>
                  <span className="muted">Available after current-period deductions and paid amounts</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Paid this period</span>
                  <strong>{formatMoney(report.summary.currentPeriodPaidNaira)}</strong>
                  <span className="muted">Marked as paid inside this reporting month</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Closing balance</span>
                  <strong>{formatMoney(report.summary.closingBalanceNaira)}</strong>
                  <span className="muted">Carry-forward after this statement</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Unique viewers</span>
                  <strong>{report.summary.uniqueAccounts}</strong>
                  <span className="muted">Tracked viewer accounts</span>
                </div>
                <div className="report-summary-card">
                  <span className="detail-label">Watch hours</span>
                  <strong>{report.summary.watchHours.toFixed(1)}</strong>
                  <span className="muted">Recorded from watch history</span>
                </div>
              </div>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Titles</span>
                  <h3>All associated titles</h3>
                </div>
                <p className="report-sheet-note">
                  The system automatically includes every title assigned to the selected producer. If a title had no unlock activity, its row still appears with zeroed values.
                </p>
              </div>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Movie title</th>
                    <th>Price</th>
                    <th>Unlocks</th>
                    <th>Gross revenue</th>
                    <th>Producer share</th>
                    <th>Unique viewers</th>
                    <th>Completion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {report.videos.length ? (
                    report.videos.map((video) => (
                      <tr key={video.id}>
                        <td>
                          <strong>{video.title}</strong>
                          <div className="muted">
                            {video.studioReleaseTitle ? `${video.studioReleaseTitle} | ` : ''}
                            {video.category}{video.releaseYear ? ` | ${video.releaseYear}` : ''}
                          </div>
                        </td>
                        <td>{formatMoney(video.priceNaira)}</td>
                        <td>{video.unlockCount}</td>
                        <td>{formatMoney(video.grossNaira)}</td>
                        <td>{formatMoney(video.creatorNaira)}</td>
                        <td>{video.uniqueAccounts}</td>
                        <td>{formatPercent(video.completionRate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7}>No titles are currently associated with this producer.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-sheet-header">
                <div>
                  <span className="report-eyebrow">Royalty detail</span>
                  <h3>Transaction line items</h3>
                </div>
                <p className="report-sheet-note">
                  Each unlock is shown with a clear movie title, payment date, customer price, deductions, and producer net revenue.
                </p>
              </div>
              <table className="table report-table">
                <thead>
                  <tr>
                    <th>Movie title</th>
                    <th>Payment date</th>
                    <th>Unlocks</th>
                    <th>Price paid</th>
                    <th>Fees and deductions</th>
                    <th>Producer net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.videos.flatMap((video) => video.transactionRows).length ? (
                    report.videos.flatMap((video) => video.transactionRows).map((row, index) => (
                      <tr key={`${row.title}-${row.date.toISOString()}-${index}`}>
                        <td>{row.title}</td>
                        <td>{formatPrintDate(row.date)}</td>
                        <td>{row.transactionCount}</td>
                        <td>{formatRecordedCharge({
                          amountMinor: row.customerPriceMinor,
                          amountNaira: row.customerPriceNaira,
                          currency: row.currency
                        })}</td>
                        <td>{formatMoney(row.serviceFeeNaira)}</td>
                        <td>{formatMoney(row.netRevenueNaira)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No transaction activity was recorded for this producer in the selected month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="report-sheet report-print-block">
              <div className="report-two-column">
                <div className="report-panel">
                  <h4>Payment details</h4>
                  <div className="report-mini-grid">
                    <div>
                      <span className="detail-label">Beneficiary</span>
                      <strong>{report.summary.paymentDetails.beneficiary ?? selectedProducer.displayName}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Bank</span>
                      <strong>{report.summary.paymentDetails.bankName ?? 'Not available'}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Account name</span>
                      <strong>{report.summary.paymentDetails.accountName ?? 'Not available'}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Account number</span>
                      <strong>{report.summary.paymentDetails.accountNumber ?? 'Not available'}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Payment reference</span>
                      <strong>{report.summary.paymentDetails.paymentReference}</strong>
                    </div>
                    <div>
                      <span className="detail-label">Remittance date</span>
                      <strong>{formatPrintDate(report.summary.paymentDetails.remittanceDate)}</strong>
                    </div>
                  </div>
                </div>
                <div className="report-panel">
                  <h4>Statement notes</h4>
                  <p className="report-note">
                    This statement was generated directly from ACE Studio unlock, settlement, payout, and watch-history records for the selected period.
                  </p>
                  <p className="report-note">
                    Missing activity is reported as zero rather than omitted. That keeps monthly reporting consistent even when a producer had no unlocks, no remittance, or no new activity.
                  </p>
                  <p className="report-note report-note-compact">
                    Content status: {report.summary.contentStatus}
                  </p>
                  <p className="report-note report-note-compact">
                    Top title this month: {report.summary.topTitle ? `${report.summary.topTitle.title} | ${formatMoney(report.summary.topTitle.grossNaira)}` : 'No unlock activity recorded'}
                  </p>
                </div>
              </div>
            </section>
          </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}
