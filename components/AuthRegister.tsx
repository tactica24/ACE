'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

export default function AuthRegister() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/browse';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, phone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteUser(credential.user).catch(() => null);
        throw new Error(data.error || 'Register failed');
      }
      window.location.href = next;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" placeholder="Phone (e.g. +234...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create account'}
      </button>
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
