import Link from 'next/link';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { createCreatorAccessLinkToken, resolveCreatorFromAccessToken } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'ace_creator_link';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatList(values: string[] | null | undefined, fallback = 'Not recorded') {
  const safeValues = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return safeValues.length ? safeValues.join(', ') : fallback;
}

function extractStringRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export default async function CreatorReportLinkPage({
  searchParams
}: {
  searchParams?: { token?: string | string[]; month?: string | string[] };
}) {
  const cookieStore = cookies();
  let token = cookieStore.get(COOKIE_NAME)?.value?.trim();

  const queryToken = firstValue(searchParams?.token)?.trim();
  if (queryToken && !token) {
    redirect(`/api/creator-link/auth?token=${encodeURIComponent(queryToken)}&redirect=/creator-link/report`);
  }

  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

  const rawMonth = firstValue(searchParams?.month)?.trim() ?? '';
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : undefined;

  if (!token) {
    notFound();
  }

  const creator = await resolveCreatorFromAccessToken(token, 'report');
  if (!creator) {
    notFound();
  }

  const uploadToken = createCreatorAccessLinkToken({
    creatorUserId: creator.id,
    scope: 'upload'
  });

  const dateFilter = selectedMonth
    ? (() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        return {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1))
        };
      })()
    : undefined;

  const videos = await prisma.video.findMany({
    where: {
      creatorId: creator.id,
      seriesId: null
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      videoType: true,
      status: true,
      createdAt: true,
      technicalMetadata: {
        select: {
          vendorId: true,
          studioReleaseTitle: true,
          countriesOfOrigin: true,
          licensedTerritories: true,
          localizations: true,
          productAvailability: true,
          deliveryFormat: true,
          englishSubtitlesProvided: true
        }
      },
      unlocks: {
        where: dateFilter
          ? { createdAt: dateFilter }
          : undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          amountNaira: true,
          amountMinor: true,
          currency: true,
          source: true,
          settlement: {
            select: {
              grossNaira: true,
              creatorNaira: true,
              platformNaira: true,
              gatewayFeeNaira: true,
              taxNaira: true,
              referralNaira: true,
              platformNetNaira: true
            }
          }
        }
      },
      _count: {
        select: {
          unlocks: dateFilter
            ? { where: { createdAt: dateFilter } }
            : true
        }
      }
    }
  });

  const rows = videos.map((video) => {
    const allSettlements = video.unlocks
      .map((unlock) => unlock.settlement)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const earningsNaira = allSettlements.reduce((sum, settlement) => sum + settlement.creatorNaira, 0);
    const grossNaira = allSettlements.reduce((sum, settlement) => sum + settlement.grossNaira, 0);
    return {
      id: video.id,
      title: video.title,
      vendorId: video.technicalMetadata?.vendorId ?? 'Not recorded',
      studioReleaseTitle: video.technicalMetadata?.studioReleaseTitle ?? null,
      countriesOfOrigin: video.technicalMetadata?.countriesOfOrigin ?? [],
      licensedTerritories: video.technicalMetadata?.licensedTerritories ?? [],
      localizations: extractStringRows(video.technicalMetadata?.localizations),
      productAvailability: extractStringRows(video.technicalMetadata?.productAvailability),
      deliveryFormat: video.technicalMetadata?.deliveryFormat ?? 'Not recorded',
      subtitlesStatus: video.technicalMetadata?.englishSubtitlesProvided ? 'English subtitles provided' : 'Not marked',
      type: video.videoType,
      status: video.status,
      uploadedAt: formatDate(video.createdAt),
      unlocks: video._count.unlocks,
      grossNaira,
      earningsNaira
    };
  });

  const totalUnlocks = rows.reduce((sum, row) => sum + row.unlocks, 0);
  const totalGross = rows.reduce((sum, row) => sum + row.grossNaira, 0);
  const totalEarnings = rows.reduce((sum, row) => sum + row.earningsNaira, 0);
  const transactionRows = videos.flatMap((video) =>
    video.unlocks.map((unlock, index) => {
      const settlement = unlock.settlement;
      const serviceFeeNaira = settlement
        ? settlement.platformNaira + settlement.gatewayFeeNaira + settlement.taxNaira + settlement.referralNaira
        : 0;

      return {
        id: `${video.id}-${unlock.createdAt.toISOString()}-${index}`,
        videoId: video.id,
        title: video.title,
        vendorId: video.technicalMetadata?.vendorId ?? 'Not recorded',
        date: unlock.createdAt,
        transactionCount: 1,
        customerPrice: unlock.amountMinor ?? unlock.amountNaira,
        currency: unlock.currency,
        source: unlock.source,
        serviceFeeNaira,
        netRevenueNaira: settlement?.creatorNaira ?? 0
      };
    })
  );
  const hasSales = totalUnlocks > 0 || totalEarnings > 0;

  return (
    <div className="section">
      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <h1 style={{ marginTop: 0 }}>Creator performance report</h1>
          <p className="muted">
            {creator.creator?.displayName ?? creator.name ?? creator.email}
            {creator.creator?.creatorNumber ? ` (${creator.creator.creatorNumber})` : ''}.
          </p>
          <div className="action-list">
            <Link className="btn btn-primary" href={`/api/creator-link/auth?token=${encodeURIComponent(uploadToken)}&redirect=/creator-link/upload`}>
              Upload new title
            </Link>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <form method="GET" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span className="field-label">Filter by month</span>
              <input className="input" type="month" name="month" defaultValue={selectedMonth} />
            </label>
            <button className="btn btn-primary" type="submit">Apply filter</button>
            {selectedMonth ? (
              <a className="btn btn-ghost" href="/creator-link/report">
                Clear filter
              </a>
            ) : null}
          </form>
        </div>

        <div className="detail-grid" style={{ marginBottom: 20 }}>
          <div className="detail-card">
            <span className="detail-label">Total titles</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Total unlocks</span>
            <strong>{totalUnlocks}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Gross sales</span>
            <strong>{formatMoney(totalGross)}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Total earnings</span>
            <strong>{formatMoney(totalEarnings)}</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Sales records</span>
            <strong>{hasSales ? 'Available' : 'No records'}</strong>
          </div>
        </div>

        <div className="card">
          <h3>Movie report</h3>
          {rows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Vendor ID</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Unlocks</th>
                    <th>Gross sales</th>
                    <th>Earnings</th>
                    <th>Live page</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.title}</strong>
                        <div className="muted">
                          {row.studioReleaseTitle ? `${row.studioReleaseTitle} | ` : ''}
                          {formatList(row.countriesOfOrigin, 'origin not recorded')}
                        </div>
                        <div className="muted">Licensed: {formatList(row.licensedTerritories, 'territory not recorded')}</div>
                      </td>
                      <td>{row.vendorId}</td>
                      <td>{row.type}</td>
                      <td>{row.status}</td>
                      <td>{row.uploadedAt}</td>
                      <td>{row.unlocks}</td>
                      <td>{row.grossNaira > 0 ? formatMoney(row.grossNaira) : 'No records'}</td>
                      <td>{row.earningsNaira > 0 ? formatMoney(row.earningsNaira) : 'No records'}</td>
                      <td>
                        <Link className="btn btn-ghost btn-compact" href={`/v/${row.id}`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>
              No uploads yet. Use the upload link to submit your first title.
            </p>
          )}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Royalty transaction detail</h3>
          {transactionRows.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Vendor ID</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Transactions</th>
                    <th>Customer price</th>
                    <th>Source</th>
                    <th>Service fee</th>
                    <th>Net revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.vendorId}</td>
                      <td>{row.title}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.transactionCount}</td>
                      <td>{row.currency === 'NGN' ? formatMoney(row.customerPrice) : `${row.currency} ${row.customerPrice}`}</td>
                      <td>{row.source}</td>
                      <td>{formatMoney(row.serviceFeeNaira)}</td>
                      <td>{formatMoney(row.netRevenueNaira)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>No live sales transactions have been recorded yet.</p>
          )}
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <h3>Delivery metadata on file</h3>
          {rows.length ? (
            <div className="stack-list">
              {rows.map((row) => (
                <div key={`${row.id}-metadata`} className="detail-card">
                  <span className="detail-label">{row.title}</span>
                  <strong>{row.vendorId}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>Format: {row.deliveryFormat} | {row.subtitlesStatus}</p>
                  <p className="muted" style={{ marginBottom: 6 }}>Availability: {row.productAvailability.slice(0, 3).join(' / ') || 'Not recorded'}</p>
                  <p className="muted" style={{ marginBottom: 0 }}>Localizations: {row.localizations.slice(0, 3).join(' / ') || 'Not recorded'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ marginBottom: 0 }}>No delivery metadata has been submitted yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
