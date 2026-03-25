'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuthClient, toFirebaseAuthErrorMessage } from '@/lib/firebase';

export default function AuthLogin() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/browse';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firebaseAuth = getFirebaseAuthClient();
      const credential = await signInWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await signOut(firebaseAuth).catch(() => null);
        throw new Error(data.error || 'Login failed');
      }
      window.location.href = next;
    } catch (error) {
      setError(toFirebaseAuthErrorMessage(error, 'Unable to sign in right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
