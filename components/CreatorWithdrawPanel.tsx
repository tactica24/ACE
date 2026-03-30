'use client';

import { useState, type FormEvent } from 'react';

type CreatorWithdrawPanelProps = {
  balanceNaira: number;
  payoutRequests: Array<{
    id: string;
    amountNaira: number;
    status: string;
    adminNote: string | null;
    requestedAt: string;
  }>;
};

export default function CreatorWithdrawPanel({ balanceNaira, payoutRequests }: CreatorWithdrawPanelProps) {
  const [amountNaira, setAmountNaira] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/studio/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNaira: Number(amountNaira) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to submit withdrawal.');
      }
      setAmountNaira('');
      setMessage('Withdrawal request sent to admin for approval.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>Withdraw from producer wallet</h3>
      <p className="muted">Available balance: NGN {balanceNaira}</p>
      <form onSubmit={submit} className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span className="field-label">Amount</span>
          <input
            className="input"
            inputMode="numeric"
            value={amountNaira}
            onChange={(event) => setAmountNaira(event.target.value)}
            required
          />
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Sending request...' : 'Request withdrawal'}
          </button>
          {message ? <p className="muted form-message">{message}</p> : null}
        </div>
      </form>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ marginBottom: 12 }}>Withdrawal history</h4>
        {payoutRequests.length ? (
          <div className="stack-list">
            {payoutRequests.map((request) => (
              <div key={request.id} className="stack-row">
                <div>
                  <strong>NGN {request.amountNaira}</strong>
                  <p className="muted">{request.requestedAt} | {request.status}</p>
                  {request.adminNote ? <p className="muted">{request.adminNote}</p> : null}
                </div>
                <span className={`status-chip ${request.status === 'PAID' ? 'status-live' : 'status-review'}`}>{request.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Your withdrawal requests will appear here after the first submission.</p>
        )}
      </div>
    </div>
  );
}
