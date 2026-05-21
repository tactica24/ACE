'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification, updateProfile } from 'firebase/auth';
import { getFirebaseAuthClient, toFirebaseAuthErrorMessage } from '@/lib/firebase';
import { getPostRegisterPath } from '@/lib/account-routing';
import { type CreatorAccessStatusValue, type RoleValue, type SignupIntentValue } from '@/lib/media-types';

type AuthResponseUser = {
  role: RoleValue;
  signupIntent: SignupIntentValue;
  creatorAccessStatus: CreatorAccessStatusValue;
};

type AuthRegisterProps = {
  initialSignupIntent?: SignupIntentValue;
  lockSignupIntent?: boolean;
  submitLabel?: string;
  helperText?: string;
};

export default function AuthRegister({
  initialSignupIntent = 'VIEWER',
  lockSignupIntent = false,
  submitLabel = 'Create account',
  helperText = 'We will send a verification email after signup.'
}: AuthRegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [signupIntent, setSignupIntent] = useState<SignupIntentValue>(initialSignupIntent);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Enter your name, email, and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const firebaseAuth = getFirebaseAuthClient();
      const credential = await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
      await updateProfile(credential.user, { displayName: trimmedName });
      const idToken = await credential.user.getIdToken();
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name: trimmedName, signupIntent })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await deleteUser(credential.user).catch(() => null);
        throw new Error(data.error || 'Register failed');
      }
      try {
        await sendEmailVerification(credential.user, {
          url: `${window.location.origin}/account?verification=email`,
          handleCodeInApp: false
        });
      } catch (error) {
        throw new Error(
          `Account created, but ${toFirebaseAuthErrorMessage(error, 'we could not send the verification email right now.')}`
        );
      }
       router.push(getPostRegisterPath(data.user as AuthResponseUser));
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
      {lockSignupIntent ? null : (
        <div className="field">
          <span className="field-label">Account type</span>
          <div className="action-list">
            <button className={signupIntent === 'VIEWER' ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setSignupIntent('VIEWER')}>
              Viewer
            </button>
            <button className={signupIntent === 'CREATOR' ? 'btn btn-primary' : 'btn btn-ghost'} type="button" onClick={() => setSignupIntent('CREATOR')}>
              Producer
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {signupIntent === 'CREATOR' ? 'Producer account' : 'Viewer account'}
          </p>
        </div>
      )}
      <input className="input" type="password" placeholder="Password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn btn-primary btn-compact auth-submit-button" type="submit" disabled={loading}>
        {loading ? 'Creating...' : submitLabel}
      </button>
      <p className="muted" style={{ margin: 0 }}>{helperText}</p>
      {error ? <p className="muted" style={{ margin: 0 }}>{error}</p> : null}
    </form>
  );
}
