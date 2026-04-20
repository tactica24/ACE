import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { createCreatorAccessLinkToken, resolveCreatorFromAccessToken } from '@/lib/creator-access-links';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CreatorReportLinkPage({
  searchParams
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = firstValue(searchParams?.token)?.trim() ?? '';
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

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
      _count: {
        select: {
          unlocks: true
        }
      },
      settlements: {
        select: {
          creatorNaira: true
        }
      }
    }
  });

  const rows = videos.map((video) => {
    const earningsNaira = video.settlements.reduce((sum, settlement) => sum + settlement.creatorNaira, 0);
    return {
      id: video.id,
      title: video.title,
      type: video.videoType,
      status: video.status,
      uploadedAt: video.createdAt.toISOString().slice(0, 10),
      unlocks: video._count.unlocks,
      earningsNaira
    };
  });

  const totalUnlocks = rows.reduce((sum, row) => sum + row.unlocks, 0);
  const totalEarnings = rows.reduce((sum, row) => sum + row.earningsNaira, 0);
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
            <Link className="btn btn-primary" href={`/creator-link/upload?token=${encodeURIComponent(uploadToken)}`}>
              Upload new title
            </Link>
          </div>
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
                    <th>Type</th>
                    <th>Status</th>
                    <th>Uploaded</th>
                    <th>Unlocks</th>
                    <th>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.title}</td>
                      <td>{row.type}</td>
                      <td>{row.status}</td>
                      <td>{row.uploadedAt}</td>
                      <td>{row.unlocks}</td>
                      <td>{row.earningsNaira > 0 ? formatMoney(row.earningsNaira) : 'No records'}</td>
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
      </div>
    </div>
  );
}
