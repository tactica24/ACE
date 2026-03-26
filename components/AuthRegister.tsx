'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, updateProfile } from 'firebase/auth';
import { getFirebaseAuthClient, toFirebaseAuthErrorMessage } from '@/lib/firebase';
import { getPostRegisterPath } from '@/lib/account-routing';
import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from '@/lib/media-types';

type AuthResponseUser = {
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
};

export default function AuthRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupIntent, setSignupIntent] = useState<SignupIntentValue>('VIEWER');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await sendEmailVerification(credential.user, {
        url: `${window.location.origin}/account?verification=email`,
        handleCodeInApp: false
      }).catch(() => null);
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name: trimmedName, phone: trimmedPhone, signupIntent })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteUser(credential.user).catch(() => null);
        throw new Error(data.error || 'Register failed');
      }
      window.location.href = getPostRegisterPath(data.user as AuthResponseUser);
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
      <div className="field">
        <span className="field-label">Account type</span>
        <div className="action-list">
          <button className={signupIntent === 'VIEWER' ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setSignupIntent('VIEWER')}>
            Viewer
          </button>
          <button className={signupIntent === 'CREATOR' ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setSignupIntent('CREATOR')}>
            Film creator
          </button>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          {signupIntent === 'CREATOR'
            ? 'Creator account'
            : 'Viewer account'}
        </p>
      </div>
      <input className="input" type="password" placeholder="Password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create account'}
      </button>
      <p className="muted" style={{ margin: 0 }}>We will send a verification email after signup.</p>
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
