'use client';

import { useState } from 'react';

type ReconciliationSummary = {
  pendingPayments: number;
  stalePendingPayments: number;
  failedPayments: number;
  pendingFamilyTransfers: number;
};

export default function AdminOpsPanel({
  initialSummary
}: {
  initialSummary: ReconciliationSummary;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runReconciliation = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/reconcile', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to run reconciliation right now.');
      }

      setSummary(data.summaryAfter ?? summary);
      setMessage(
        `Scanned ${data.result?.scanned ?? 0}, reconciled ${data.result?.reconciled ?? 0}, failed ${data.result?.failed ?? 0}, still pending ${data.result?.stillPending ?? 0}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to run reconciliation right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="stack-row" style={{ alignItems: 'start' }}>
        <div>
          <h3 style={{ marginBottom: 8 }}>Commerce reconciliation</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Keep wallet top-ups aligned even when webhooks or gateway callbacks arrive late.
          </p>
        </div>
        <button className="btn btn-primary" type="button" onClick={runReconciliation} disabled={loading}>
          {loading ? 'Reconciling...' : 'Run now'}
        </button>
      </div>

      <div className="detail-grid" style={{ marginTop: 12 }}>
        <div className="detail-card">
          <span className="detail-label">Pending</span>
          <strong>{summary.pendingPayments}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Stale</span>
          <strong>{summary.stalePendingPayments}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Failed</span>
          <strong>{summary.failedPayments}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Family pending</span>
          <strong>{summary.pendingFamilyTransfers}</strong>
        </div>
      </div>

      {message ? <p className="muted" style={{ marginBottom: 0, marginTop: 14 }}>{message}</p> : null}
    </div>
  );
}
