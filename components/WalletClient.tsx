'use client';

import { useState } from 'react';
import { formatNaira } from '@/lib/format';

export default function WalletClient({
  balance,
  credits,
  passCredits,
  isDiaspora
}: {
  balance: number;
  credits: number;
  passCredits: number;
  isDiaspora: boolean;
}) {
  const [topupAmount, setTopupAmount] = useState(500);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [shareAmount, setShareAmount] = useState(1);
  const [shareType, setShareType] = useState<'CREDITS' | 'BALANCE'>('CREDITS');
  const [walletBalance, setWalletBalance] = useState(balance);
  const [walletCredits, setWalletCredits] = useState(credits);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleTopup = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNaira: topupAmount })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Topup failed');
      if (!data.authorizationUrl) throw new Error('Unable to start top-up right now.');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start top-up.');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/pass/subscribe', {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Pass failed');
      if (!data.authorizationUrl) throw new Error('Unable to start pass subscription right now.');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start pass subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyPass = async () => {
    if (!recipientPhone) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/family/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Family pass failed');
      if (!data.authorizationUrl) throw new Error('Unable to start family bundle right now.');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start family pass.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyShare = async () => {
    if (!recipientPhone) {
      setFeedback('Enter the family member phone number first.');
      return;
    }

    setShareLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/family/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientPhone,
          shareType,
          amount: shareAmount
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to share with family right now.');
      }

      setWalletBalance(data.wallet?.balanceNaira ?? walletBalance);
      setWalletCredits(data.wallet?.credits ?? walletCredits);
      setFeedback(data.message ?? 'Family share sent successfully.');
      setRecipientPhone('');
      setShareAmount(1);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to share with family right now.');
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <div className="stack-list">
      {feedback ? <p className="muted form-message" style={{ margin: 0 }}>{feedback}</p> : null}

      <div className="grid">
      <div className="card">
        <h3>Available wallet</h3>
        <p className="hero-title" style={{ fontSize: '2rem' }}>{formatNaira(walletBalance)}</p>
        <p className="muted">Wallet credits: {walletCredits}</p>
        <p className="muted">Pass credits: {passCredits}</p>
      </div>

      <div className="card">
        <h3>Top up wallet</h3>
        <input
          className="input"
          type="number"
          value={topupAmount}
          onChange={(e) => setTopupAmount(parseInt(e.target.value || '0', 10))}
        />
        <button className="btn btn-primary" onClick={handleTopup} disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Starting...' : `Top up ${formatNaira(topupAmount)}`}
        </button>
      </div>

      <div className="card card-soft">
        <h3>Hybrid Pass</h3>
        <p className="muted">30 credits for NGN 2,500.</p>
        <button className="btn btn-ghost" onClick={handlePass} disabled={loading}>
          Activate pass
        </button>
      </div>
      <div className="card">
        <h3>Share with family</h3>
        <input
          className="input"
          placeholder="Family member phone number"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
        />
        <div className="action-list" style={{ marginTop: 12 }}>
          <button
            className={shareType === 'CREDITS' ? 'btn btn-primary' : 'btn btn-ghost'}
            type="button"
            onClick={() => setShareType('CREDITS')}
          >
            Credits
          </button>
          <button
            className={shareType === 'BALANCE' ? 'btn btn-primary' : 'btn btn-ghost'}
            type="button"
            onClick={() => setShareType('BALANCE')}
          >
            Balance
          </button>
        </div>
        <input
          className="input"
          type="number"
          min={1}
          value={shareAmount}
          onChange={(e) => setShareAmount(Math.max(1, parseInt(e.target.value || '1', 10)))}
          style={{ marginTop: 12 }}
          placeholder={shareType === 'CREDITS' ? 'Number of credits' : 'Amount in naira'}
        />
        <div className="action-list" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" type="button" onClick={handleFamilyShare} disabled={shareLoading}>
            {shareLoading ? 'Sharing...' : shareType === 'CREDITS' ? 'Share credits' : 'Share balance'}
          </button>
          <button className="btn btn-ghost" onClick={handleFamilyPass} disabled={loading || !recipientPhone} type="button">
            {loading ? 'Starting...' : 'Buy family bundle'}
          </button>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {isDiaspora
            ? 'The recipient must already have an Ace Studio account linked to that phone number.'
            : 'Family credit or balance sharing is available on diaspora-funded accounts. You can still enter the recipient number here and use family bundle checkout where eligible.'}
        </p>
      </div>
      </div>
    </div>
  );
}



