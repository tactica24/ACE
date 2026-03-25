'use client';

import { useEffect, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase';

type PairingSession = {
  sessionId: string;
  code: string;
  expiresAt: string;
  claimUrl: string;
};

export default function TvPairingPanel() {
  const [session, setSession] = useState<PairingSession | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'claimed' | 'completed' | 'expired'>('idle');
  const [claimedBy, setClaimedBy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/tv/pair/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName: 'Ace Studio TV', platform: 'tv-web' })
    })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setSession(data);
        setStatus('pending');
      })
      .catch(() => {
        if (active) setStatus('expired');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session || status === 'completed' || status === 'expired') return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tv/pair/status?sessionId=${session.sessionId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!active) return;
        if (data.status === 'CLAIMED') {
          setClaimedBy(data.claimedBy ?? null);
          setStatus('claimed');
          const finalize = await fetch('/api/tv/pair/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.sessionId })
          });
          const finalizePayload = await finalize.json().catch(() => ({}));
          if (!finalize.ok || !finalizePayload.customToken) {
            return;
          }

          const credential = await signInWithCustomToken(getFirebaseAuthClient(), finalizePayload.customToken);
          const idToken = await credential.user.getIdToken();
          const login = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
          if (login.ok) {
            setStatus('completed');
            window.location.reload();
            return;
          }
        } else if (data.status === 'EXPIRED') {
          setStatus('expired');
        }
      } catch {
        return;
      }
    };

    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session, status]);

  return (
    <div className="card" style={{ minHeight: 260, display: 'grid', gap: 14 }}>
      <div className="badge">TV Pairing</div>
      <h3 style={{ margin: 0 }}>Sign in on your phone, continue on TV</h3>
      <p className="muted" style={{ margin: 0 }}>
        Open the pairing page on your phone and enter the code below to link this screen instantly.
      </p>
      {session ? (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '0.24em' }}>{session.code}</div>
            <a className="btn btn-ghost" href={session.claimUrl}>
              Pair this screen
            </a>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Status: {status === 'claimed' && claimedBy ? `Claimed by ${claimedBy}` : status}
          </p>
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Preparing pairing session...</p>
      )}
    </div>
  );
}
