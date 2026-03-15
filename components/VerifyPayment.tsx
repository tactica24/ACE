'use client';

import { useEffect, useState } from 'react';

export default function VerifyPayment({ reference }: { reference: string | null }) {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');

  useEffect(() => {
    if (!reference) {
      setStatus('error');
      return;
    }
    let timer: NodeJS.Timeout | null = null;
    const verify = async () => {
      try {
        const res = await fetch('/api/wallet/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference })
        });
        if (res.status === 202) {
          setStatus('pending');
          timer = setTimeout(verify, 2000);
          return;
        }
        if (!res.ok) throw new Error('verify failed');
        setStatus('success');
      } catch {
        setStatus('error');
      }
    };
    verify();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [reference]);

  if (status === 'pending') return <p className="muted">Verifying payment...</p>;
  if (status === 'success') return <p>Payment verified. Wallet updated.</p>;
  return <p>Unable to verify payment. Contact support.</p>;
}



