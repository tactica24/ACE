'use client';

import { useState } from 'react';
import { formatCredits, getCreditsForNaira } from '@/lib/credits';
import { formatRecordedCharge } from '@/lib/format';

type PaymentRow = {
  id: string;
  reference: string;
  gateway: string;
  status: string;
  amountNaira: number;
  amountMinor: number | null;
  currency: string;
  createdAt: string;
};

type SupportActionRow = {
  id: string;
  actionType: string;
  amountNairaDelta: number;
  creditsDelta: number;
  resultingBalanceNaira: number | null;
  resultingCredits: number | null;
  note: string;
  createdAt: string;
  adminEmail: string;
};

export default function AdminCommerceSupportPanel({
  userId,
  wallet,
  recentPayments,
  initialActions
}: {
  userId: string;
  wallet: { balanceNaira: number; credits: number };
  recentPayments: PaymentRow[];
  initialActions: SupportActionRow[];
}) {
  const [reference, setReference] = useState(recentPayments[0]?.reference ?? '');
  const [statusNote, setStatusNote] = useState('');
  const [amountNairaDelta, setAmountNairaDelta] = useState(0);
  const [creditsDelta, setCreditsDelta] = useState(0);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [walletState, setWalletState] = useState(wallet);
  const [payments, setPayments] = useState(recentPayments);
  const [actions, setActions] = useState(initialActions);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const recordAction = (action: SupportActionRow) => {
    setActions((current) => [action, ...current].slice(0, 20));
  };

  const updatePayment = (payment: PaymentRow) => {
    setPayments((current) => {
      const existing = current.find((item) => item.reference === payment.reference);
      if (existing) {
        return current.map((item) => (item.reference === payment.reference ? payment : item));
      }

      return [payment, ...current].slice(0, 20);
    });
  };

  const runAction = async (payload: Record<string, unknown>, loadingKey: string) => {
    setLoading(loadingKey);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/user-support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Support action failed.');
      }
      return data;
    } finally {
      setLoading(null);
    }
  };

  const verifyPayment = async () => {
    const data = await runAction({ action: 'VERIFY_PAYMENT', userId, reference }, 'verify').catch((error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to verify payment.');
      return null;
    });
    if (!data) return;

    if (data.payment) {
      updatePayment({
        id: data.payment.id,
        reference: data.payment.reference,
        gateway: data.payment.gateway,
        status: data.payment.status,
        amountNaira: data.payment.amountNaira,
        amountMinor: data.payment.amountMinor,
        currency: data.payment.currency,
        createdAt: new Date(data.payment.createdAt).toISOString().slice(0, 10)
      });
    }
    if (data.action) {
      recordAction({
        id: data.action.id,
        actionType: data.action.actionType,
        amountNairaDelta: data.action.amountNairaDelta,
        creditsDelta: data.action.creditsDelta,
        resultingBalanceNaira: data.action.resultingBalanceNaira,
        resultingCredits: data.action.resultingCredits,
        note: data.action.note,
        createdAt: new Date(data.action.createdAt).toISOString().slice(0, 10),
        adminEmail: data.action.adminUser.email
      });
    }
    setFeedback(`Verification complete. Gateway status: ${data.externalStatus}.`);
  };

  const updatePaymentStatus = async (status: 'REFUNDED' | 'REVERSED') => {
    const data = await runAction(
      { action: 'UPDATE_PAYMENT_STATUS', reference, status, note: statusNote },
      status.toLowerCase()
    ).catch((error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to update payment status.');
      return null;
    });
    if (!data) return;

    if (data.payment) {
      updatePayment({
        id: data.payment.id,
        reference: data.payment.reference,
        gateway: data.payment.gateway,
        status: data.payment.status,
        amountNaira: data.payment.amountNaira,
        amountMinor: data.payment.amountMinor,
        currency: data.payment.currency,
        createdAt: new Date(data.payment.createdAt).toISOString().slice(0, 10)
      });
    }
    if (data.action) {
      recordAction({
        id: data.action.id,
        actionType: data.action.actionType,
        amountNairaDelta: data.action.amountNairaDelta,
        creditsDelta: data.action.creditsDelta,
        resultingBalanceNaira: data.action.resultingBalanceNaira,
        resultingCredits: data.action.resultingCredits,
        note: data.action.note,
        createdAt: new Date(data.action.createdAt).toISOString().slice(0, 10),
        adminEmail: data.action.adminUser.email
      });
    }
    setFeedback(`Payment marked ${status.toLowerCase()}.`);
  };

  const applyAdjustment = async () => {
    const data = await runAction(
      {
        action: 'ADJUST_ACCOUNT',
        userId,
        reference: reference || undefined,
        amountNairaDelta,
        creditsDelta,
        note: adjustmentNote
      },
      'adjust'
    ).catch((error) => {
      setFeedback(error instanceof Error ? error.message : 'Unable to adjust the account.');
      return null;
    });
    if (!data) return;

    setWalletState({
      balanceNaira: data.wallet.balanceNaira,
      credits: data.wallet.credits
    });
    if (data.action) {
      recordAction({
        id: data.action.id,
        actionType: data.action.actionType,
        amountNairaDelta: data.action.amountNairaDelta,
        creditsDelta: data.action.creditsDelta,
        resultingBalanceNaira: data.action.resultingBalanceNaira,
        resultingCredits: data.action.resultingCredits,
        note: data.action.note,
        createdAt: new Date(data.action.createdAt).toISOString().slice(0, 10),
        adminEmail: data.action.adminUser.email
      });
    }
    setAdjustmentNote('');
    setAmountNairaDelta(0);
    setCreditsDelta(0);
    setFeedback('User wallet updated and logged.');
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>Commerce rescue tools</h3>
        <p className="muted">Verify gateway status, mark operational outcomes, and keep an audit trail for each intervention.</p>
        <label className="field">
          <span className="field-label">Payment reference</span>
          <input className="input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="ace_topup_..." />
        </label>
        <div className="action-list" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="button" onClick={verifyPayment} disabled={loading === 'verify'}>
            {loading === 'verify' ? 'Checking...' : 'Verify with gateway'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => updatePaymentStatus('REFUNDED')} disabled={loading === 'refunded'}>
            {loading === 'refunded' ? 'Saving...' : 'Mark refunded'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => updatePaymentStatus('REVERSED')} disabled={loading === 'reversed'}>
            {loading === 'reversed' ? 'Saving...' : 'Mark reversed'}
          </button>
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">Support note for refund or reversal</span>
          <textarea className="input" rows={3} value={statusNote} onChange={(event) => setStatusNote(event.target.value)} />
        </label>
        {feedback ? <p className="muted" style={{ marginBottom: 0 }}>{feedback}</p> : null}
      </div>

      <div className="card">
        <h3>Wallet and credit remediation</h3>
        <p className="muted">
          Current balance: {formatRecordedCharge({ amountMinor: walletState.balanceNaira * 100, amountNaira: walletState.balanceNaira, currency: 'NGN' })} | {formatCredits(getCreditsForNaira(walletState.balanceNaira))} value
        </p>
        <p className="muted">Stored credits: {formatCredits(walletState.credits)}</p>
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Wallet delta (NGN)</span>
            <input className="input" type="number" value={amountNairaDelta} onChange={(event) => setAmountNairaDelta(Math.round(Number(event.target.value || '0')))} />
          </label>
          <label className="field">
            <span className="field-label">Credits delta</span>
            <input className="input" type="number" step="0.5" value={creditsDelta} onChange={(event) => setCreditsDelta(Number(event.target.value || '0'))} />
          </label>
        </div>
        <label className="field" style={{ marginTop: 12 }}>
          <span className="field-label">Support note</span>
          <textarea className="input" rows={3} value={adjustmentNote} onChange={(event) => setAdjustmentNote(event.target.value)} />
        </label>
        <div className="action-list" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="button" onClick={applyAdjustment} disabled={loading === 'adjust'}>
            {loading === 'adjust' ? 'Applying...' : 'Apply adjustment'}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Recent payment context</h3>
        {payments.length ? (
          <div className="stack-list">
            {payments.map((payment) => (
              <button
                key={payment.id}
                className="user-menu-link"
                type="button"
                onClick={() => setReference(payment.reference)}
              >
                <span>
                  {payment.reference}
                  <br />
                  <span className="muted">{payment.gateway} | {payment.status} | {payment.createdAt}</span>
                </span>
                <span>
                  {formatRecordedCharge({
                    amountMinor: payment.amountMinor ?? payment.amountNaira * 100,
                    amountNaira: payment.amountNaira,
                    currency: payment.currency
                  })}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">No recent payment records for this user yet.</p>
        )}
      </div>

      <div className="card">
        <h3>Support action history</h3>
        {actions.length ? (
          <div className="stack-list">
            {actions.map((action) => (
              <div key={action.id} className="stack-row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <strong>{action.actionType}</strong>
                  <p className="muted" style={{ marginBottom: 6 }}>{action.createdAt} | {action.adminEmail}</p>
                  <p className="muted" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{action.note}</p>
                </div>
                <div className="stack-list" style={{ gap: 4 }}>
                  {action.amountNairaDelta !== 0 ? <span className="muted">NGN {action.amountNairaDelta > 0 ? '+' : ''}{action.amountNairaDelta}</span> : null}
                  {action.creditsDelta !== 0 ? <span className="muted">{action.creditsDelta > 0 ? '+' : ''}{action.creditsDelta} credits</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Admin recovery actions will appear here.</p>
        )}
      </div>
    </div>
  );
}
