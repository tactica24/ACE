'use client';

import { useState } from 'react';
import { formatNaira } from '@/lib/format';

export default function WalletClient({
  balance,
  credits
}: {
  balance: number;
  credits: number;
}) {
  const [topupAmount, setTopupAmount] = useState(500);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTopup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountNaira: topupAmount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Topup failed');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      alert('Unable to start top-up.');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pass/subscribe', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Pass failed');
      window.location.href = data.authorizationUrl;
    } catch {
      alert('Unable to start pass subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyPass = async () => {
    if (!recipientPhone) return;
    setLoading(true);
    try {
      const res = await fetch('/api/family/pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientPhone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Family pass failed');
      window.location.href = data.authorizationUrl;
    } catch {
      alert('Unable to start family pass.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>Wallet Balance</h3>
        <p className="hero-title" style={{ fontSize: '2rem' }}>{formatNaira(balance)}</p>
        <p className="muted">Credits: {credits}</p>
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
        <p className="muted">NGN 2,500 / month for 30 credits.</p>
        <button className="btn btn-ghost" onClick={handlePass} disabled={loading}>
          Activate pass
        </button>
      </div>
      <div className="card">
        <h3>Family Pass (Diaspora)</h3>
        <p className="muted">Send a home bundle to a Nigerian phone number.</p>
        <input
          className="input"
          placeholder="Recipient phone"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
        />
        <button className="btn btn-ghost" onClick={handleFamilyPass} disabled={loading || !recipientPhone} style={{ marginTop: 12 }}>
          Send bundle
        </button>
      </div>
    </div>
  );
}



