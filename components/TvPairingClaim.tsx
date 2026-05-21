'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const PAIRING_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function normalizePairingCode(value: string) {
  return value.toUpperCase().replace(/\s+/g, '');
}

export default function TvPairingClaim() {
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const value = params.get('code');
    if (value) setCode(normalizePairingCode(value).slice(0, 6));
  }, [params]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = normalizePairingCode(code);
    if (!PAIRING_CODE_PATTERN.test(normalizedCode)) {
      setMessage('Enter the 6-character code shown on the TV screen.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tv/pair/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalizedCode })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to pair screen');
      setCode(normalizedCode);
      setMessage('Code accepted. Keep the TV screen open while it completes sign-in.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to pair screen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleClaim} className="form-grid">
      <input
        className="input"
        value={code}
        onChange={(e) => setCode(normalizePairingCode(e.target.value).slice(0, 6))}
        placeholder="Enter TV code"
        maxLength={6}
        inputMode="text"
        autoComplete="one-time-code"
      />
      <button className="btn btn-primary" type="submit" disabled={loading || !PAIRING_CODE_PATTERN.test(normalizePairingCode(code))}>
        {loading ? 'Linking...' : 'Link screen'}
      </button>
      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}
    </form>
  );
}
