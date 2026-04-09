'use client';

import { useState, type FormEvent } from 'react';
import { formatCurrencyAmount, formatNaira } from '@/lib/format';

type CreatorWithdrawPanelProps = {
  balanceNaira: number;
  balanceLabel: string;
  displayCurrency: string;
  exchangeRateNaira: number;
  payoutRequests: Array<{
    id: string;
    amountLabel: string;
    amountNaira: number;
    status: string;
    statusDetail: string | null;
    adminNote: string | null;
    requestedAt: string;
  }>;
};

export default function CreatorWithdrawPanel({
  balanceNaira,
  balanceLabel,
  displayCurrency,
  exchangeRateNaira,
  payoutRequests
}: CreatorWithdrawPanelProps) {
  const [amountDisplay, setAmountDisplay] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const usesLocalizedDisplay = displayCurrency !== 'NGN';
  const parsedDisplayAmount = Number(amountDisplay);
  const amountNaira = !Number.isFinite(parsedDisplayAmount) || parsedDisplayAmount <= 0
    ? 0
    : Math.round(parsedDisplayAmount * exchangeRateNaira);
  const displayPreview = amountNaira > 0
    ? usesLocalizedDisplay
      ? `${formatCurrencyAmount(parsedDisplayAmount, displayCurrency)} converts to ${formatNaira(amountNaira)} for payout.`
      : `This request will be stored as ${formatNaira(amountNaira)}.`
    : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/studio/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNaira })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to submit withdrawal.');
      }
      setAmountDisplay('');
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
      <p className="muted">Available balance: {balanceLabel}</p>
      <p className="muted">Available balance already excludes any withdrawal requests that are still pending or approved for payout.</p>
      {usesLocalizedDisplay ? <p className="muted">Requests are converted to your saved payout currency value and stored in naira for settlement.</p> : null}
      <form onSubmit={submit} className="form-grid" style={{ marginTop: 16 }}>
        <label className="field">
          <span className="field-label">Amount ({displayCurrency})</span>
          <input
            className="input"
            inputMode="decimal"
            type="number"
            min={usesLocalizedDisplay ? '0.01' : '1'}
            step={usesLocalizedDisplay ? '0.01' : '1'}
            max={usesLocalizedDisplay ? (balanceNaira / exchangeRateNaira).toFixed(2) : `${balanceNaira}`}
            value={amountDisplay}
            onChange={(event) => setAmountDisplay(event.target.value)}
            required
          />
        </label>
        {displayPreview ? <p className="muted form-message">{displayPreview}</p> : null}
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={loading || amountNaira <= 0 || amountNaira > balanceNaira}>
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
                  <strong>{request.amountLabel}</strong>
                  <p className="muted">{request.requestedAt} | {request.status}</p>
                  {request.statusDetail ? <p className="muted">{request.statusDetail}</p> : null}
                  {displayCurrency !== 'NGN' ? <p className="muted">Settlement record: {formatNaira(request.amountNaira)}</p> : null}
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
