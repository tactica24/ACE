'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatNaira } from '@/lib/format';

export default function WalletClient({
  balance,
  isDiaspora,
  checkoutCurrency
}: {
  balance: number;
  isDiaspora: boolean;
  checkoutCurrency: string;
}) {
  const [topupAmount, setTopupAmount] = useState(500);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareAmount, setShareAmount] = useState(500);
  const [walletBalance, setWalletBalance] = useState(balance);
  const [loading, setLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();
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
       router.push(data.authorizationUrl);
     } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start top-up.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyShare = async () => {
    if (!recipientEmail) {
      setFeedback('Enter the family member email address first.');
      return;
    }

    setShareLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/family/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          shareType: 'BALANCE',
          amount: shareAmount
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Unable to share with family right now.');
      }

      setWalletBalance(data.wallet?.balanceNaira ?? walletBalance);
      setFeedback(data.message ?? 'Family share sent successfully.');
      setRecipientEmail('');
      setShareAmount(500);
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
          <p className="muted">Unlocks debit directly from this wallet amount.</p>
        </div>

        <div className="card">
          <h3>Top up wallet</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Wallet balance stays in naira. Checkout uses {checkoutCurrency} for your current location when needed.
          </p>
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

        <div className="card">
          <h3>Share with family</h3>
          <input
            className="input"
            type="email"
            placeholder="Family member email address"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
          />
          <input
            className="input"
            type="number"
            min={1}
            step={1}
            value={shareAmount}
            onChange={(e) => setShareAmount(Math.max(1, Number(e.target.value || '1')))}
            style={{ marginTop: 12 }}
            placeholder="Amount in naira"
          />
          <p className="muted" style={{ margin: '8px 0 0' }}>
            This sends {formatNaira(shareAmount)}.
          </p>
          <div className="action-list" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="button" onClick={handleFamilyShare} disabled={shareLoading}>
              {shareLoading ? 'Sharing...' : 'Share balance'}
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {isDiaspora
              ? 'Family sharing uses the recipient account email.'
              : 'Family balance sharing is available on diaspora-funded accounts.'}
          </p>
        </div>
      </div>
    </div>
  );
}
