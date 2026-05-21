'use client';

import { useEffect, useState } from 'react';

type PromoterOption = { id: string; email: string };
type VideoOption = { id: string; title: string };

type ReferralLink = {
  id: string;
  code: string;
  promoter: { id: string; email: string };
  commissionPercent: number;
  targetVideo?: { id: string; title: string } | null;
  expiresAt?: string | null;
  createdAt: string;
  metrics: { unlocks: number; topups: number; commissionNaira: number; lastEventAt?: string | null };
  linkUrl: string;
};

export default function ReferralManager({
  promoters,
  videos,
  grafanaUrl
}: {
  promoters: PromoterOption[];
  videos: VideoOption[];
  grafanaUrl?: string | null;
}) {
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoterId, setPromoterId] = useState(promoters[0]?.id ?? '');
  const [commissionPercent, setCommissionPercent] = useState(15);
  const [targetVideoId, setTargetVideoId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const fetchLinks = async () => {
    const res = await fetch('/api/admin/referrals');
    if (!res.ok) return;
    const data = await res.json();
    setLinks(data.links ?? []);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async () => {
    if (!promoterId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoterId,
          commissionPercent,
          targetVideoId: targetVideoId || null,
          expiresAt: expiresAt || null
        })
      });
      if (!res.ok) throw new Error('create failed');
      await fetchLinks();
    } catch {
      alert('Unable to create referral link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h3>Create referral link</h3>
        <div className="field-grid field-grid-2" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="field-label">Promoter</span>
            <select className="input" value={promoterId} onChange={(event) => setPromoterId(event.target.value)}>
              {promoters.map((promoter) => (
                <option key={promoter.id} value={promoter.id}>
                  {promoter.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Commission percent</span>
            <input
              className="input"
              type="number"
              value={commissionPercent}
              onChange={(event) => setCommissionPercent(parseInt(event.target.value || '0', 10))}
            />
          </label>
        </div>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Target movie</span>
            <select className="input" value={targetVideoId} onChange={(event) => setTargetVideoId(event.target.value)}>
              <option value="">Any title</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>{video.title}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Expiry date</span>
            <input className="input" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating...' : 'Create referral link'}
        </button>
      </div>

      <div className="card">
        <div className="stack-row">
          <h3>Referral performance</h3>
          {grafanaUrl ? (
            <a className="btn btn-ghost" href={grafanaUrl} target="_blank" rel="noreferrer">
              Open Grafana
            </a>
          ) : null}
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Promoter</th>
                <th>Commission</th>
                <th>Target</th>
                <th>Unlocks</th>
                <th>Top-ups</th>
                <th>Commission NGN</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id}>
                  <td>{link.code}</td>
                  <td>{link.promoter.email}</td>
                  <td>{link.commissionPercent}%</td>
                  <td>{link.targetVideo?.title ?? 'Any'}</td>
                  <td>{link.metrics?.unlocks ?? 0}</td>
                  <td>{link.metrics?.topups ?? 0}</td>
                  <td>{link.metrics?.commissionNaira ?? 0}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      onClick={() => navigator.clipboard?.writeText(link.linkUrl)}
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
              {links.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">Referral links will appear here after creation.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
