'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CREDIT_UNIT_VALUE_NAIRA, formatCredits, getCreditsForNaira } from '@/lib/credits';
import { formatNaira } from '@/lib/format';

export default function WalletClient({
  balance,
  credits,
  passCredits,
  passCreditsPerBundle,
  familyBundleCredits,
  isDiaspora,
  checkoutCurrency,
  passChargeLabel,
  familyPassChargeLabel
}: {
  balance: number;
  credits: number;
  passCredits: number;
  passCreditsPerBundle: number;
  familyBundleCredits: number;
  isDiaspora: boolean;
  checkoutCurrency: string;
  passChargeLabel: string;
  familyPassChargeLabel: string | null;
}) {
  const passWatchCount = Math.floor((passCreditsPerBundle * 100) / CREDIT_UNIT_VALUE_NAIRA);
  const [topupAmount, setTopupAmount] = useState(500);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shareAmount, setShareAmount] = useState(1);
  const [shareType, setShareType] = useState<'CREDITS' | 'BALANCE'>('CREDITS');
  const [walletBalance, setWalletBalance] = useState(balance);
  const [walletCredits, setWalletCredits] = useState(credits);
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
       router.push(data.authorizationUrl);
     } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start pass subscription.');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyPass = async () => {
    if (!recipientEmail) return;
    setLoading(true);
    setFeedback(null);
     try {
       const res = await fetch('/api/family/pass', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ recipientEmail })
       });
       const data = await res.json().catch(() => ({}));
       if (!res.ok) throw new Error(data?.error ?? 'Family pass failed');
       if (!data.authorizationUrl) throw new Error('Unable to start family bundle right now.');
       router.push(data.authorizationUrl);
     } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to start family pass.');
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
      setRecipientEmail('');
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
          <p className="muted">Wallet balance value: {formatCredits(getCreditsForNaira(walletBalance))}</p>
          <p className="muted">Wallet credits: {formatCredits(walletCredits)}</p>
          <p className="muted">Pass credits: {formatCredits(passCredits)}</p>
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
            {loading ? 'Starting...' : `Top up ${formatNaira(topupAmount)} | ${formatCredits(getCreditsForNaira(topupAmount))} value`}
          </button>
        </div>

        <div className="card card-soft">
          <h3>Hybrid Pass</h3>
          <p className="muted">
            {formatCredits(passCreditsPerBundle)} for {passChargeLabel}. At NGN {CREDIT_UNIT_VALUE_NAIRA} per snack movie or episode, that covers {passWatchCount} watches.
          </p>
          <button className="btn btn-ghost" onClick={handlePass} disabled={loading}>
            Activate pass
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
            min={shareType === 'CREDITS' ? 0.5 : 1}
            step={shareType === 'CREDITS' ? 0.5 : 1}
            value={shareAmount}
            onChange={(e) => setShareAmount(Math.max(shareType === 'CREDITS' ? 0.5 : 1, Number(e.target.value || '1')))}
            style={{ marginTop: 12 }}
            placeholder={shareType === 'CREDITS' ? 'Number of credits' : 'Amount in naira'}
          />
          <p className="muted" style={{ margin: '8px 0 0' }}>
            {shareType === 'CREDITS'
              ? `This sends ${formatCredits(shareAmount)}.`
              : `This sends ${formatNaira(shareAmount)} | ${formatCredits(getCreditsForNaira(shareAmount))} value.`}
          </p>
          <div className="action-list" style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="button" onClick={handleFamilyShare} disabled={shareLoading}>
              {shareLoading ? 'Sharing...' : shareType === 'CREDITS' ? 'Share credits' : 'Share balance'}
            </button>
            <button className="btn btn-ghost" onClick={handleFamilyPass} disabled={loading || !recipientEmail} type="button">
              {loading ? 'Starting...' : 'Buy family bundle'}
            </button>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            {isDiaspora
              ? `Family sharing uses the recipient account email.${familyPassChargeLabel ? ` Family bundle checkout starts at ${familyPassChargeLabel} for ${formatCredits(familyBundleCredits)}.` : ''}`
              : 'Family credit or balance sharing is available on diaspora-funded accounts. You can still enter the recipient email here and use family bundle checkout where eligible.'}
          </p>
        </div>
      </div>
    </div>
  );
}
