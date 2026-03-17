'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function TvPairingClaim() {
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const value = params.get('code');
    if (value) setCode(value.toUpperCase());
  }, [params]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/tv/pair/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unable to pair screen');
      setMessage('Screen linked. Your TV will sign in automatically.');
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
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter TV code"
        maxLength={6}
      />
      <button className="btn btn-primary" type="submit" disabled={loading || code.trim().length < 6}>
        {loading ? 'Linking...' : 'Link TV'}
      </button>
      {message ? <p className="muted" style={{ margin: 0 }}>{message}</p> : null}
    </form>
  );
}
