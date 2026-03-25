'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, updateProfile } from 'firebase/auth';
import { getFirebaseAuthClient, toFirebaseAuthErrorMessage } from '@/lib/firebase';

export default function AuthRegister() {
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = params.get('next') || '/browse';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !password) {
      setError('Enter your name, email, phone number, and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firebaseAuth = getFirebaseAuthClient();
      const credential = await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
      await updateProfile(credential.user, { displayName: trimmedName });
      await sendEmailVerification(credential.user).catch(() => null);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name: trimmedName, phone: trimmedPhone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteUser(credential.user).catch(() => null);
        throw new Error(data.error || 'Register failed');
      }
      window.location.href = next;
    } catch (error) {
      setError(toFirebaseAuthErrorMessage(error, 'Unable to create your account right now.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <input className="input" placeholder="Full name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input" type="email" placeholder="Email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" placeholder="Phone (e.g. +234...)" autoComplete="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      <input className="input" type="password" placeholder="Password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create account'}
      </button>
      <p className="muted" style={{ margin: 0 }}>We will send a verification email after signup.</p>
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
