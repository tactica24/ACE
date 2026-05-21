'use client';

import { onAuthStateChanged, reload, sendEmailVerification, type User as FirebaseUser } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFirebaseAuthClient, toFirebaseAuthErrorMessage } from '@/lib/firebase';

type VerificationBadgeProps = {
  verified: boolean;
  label: string;
};

function VerificationBadge({ verified, label }: VerificationBadgeProps) {
  return (
    <span
      className="badge"
      style={{
        background: verified ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
        borderColor: verified ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.35)',
        color: verified ? '#166534' : '#92400e'
      }}
    >
      {verified ? 'Verified' : label}
    </span>
  );
}

async function refreshServerSession(user: FirebaseUser) {
  const idToken = await user.getIdToken(true);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Unable to refresh your account session.');
  }
}

export default function AccountVerificationPanel({
  email,
  initialEmailVerified
}: {
  email: string;
  initialEmailVerified: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailVerified, setEmailVerified] = useState(initialEmailVerified);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const verificationState = searchParams.get('verification');
    if (verificationState === 'sent') {
      setFeedback('Verification email sent. Open your inbox, confirm the link, then refresh your status here.');
    } else if (verificationState === 'required') {
      setFeedback('Please verify your email to unlock titles, fund your wallet, and finish setting up your account.');
    } else if (verificationState === 'email') {
      setFeedback('Email confirmed. Refreshing your account status...');
    }
  }, [searchParams]);

  useEffect(() => {
    const firebaseAuth = getFirebaseAuthClient();
    let active = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      setFirebaseReady(true);

      if (!user) {
        return;
      }

      void (async () => {
        await user.reload().catch(() => null);
        if (!active || emailVerified || !user.emailVerified) {
          return;
        }

        try {
          await refreshServerSession(user);
          if (!active) {
            return;
          }
          setEmailVerified(true);
          setFeedback('Email verified successfully.');
          router.refresh();
        } catch (error) {
          setFeedback(toFirebaseAuthErrorMessage(error, 'Email verification succeeded, but the account session could not be refreshed yet.'));
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [emailVerified, router]);

  const handleSendEmailVerification = async () => {
    setSending(true);
    setFeedback(null);

    try {
      const user = firebaseUser ?? getFirebaseAuthClient().currentUser;
      if (!user) {
        throw new Error('Sign in again to send a fresh verification email.');
      }

      await reload(user);
      if (user.emailVerified) {
        await refreshServerSession(user);
        setEmailVerified(true);
        setFeedback('Email verified successfully.');
        router.refresh();
        return;
      }

      await sendEmailVerification(user, {
        url: `${window.location.origin}/account?verification=email`,
        handleCodeInApp: false
      });

      setFeedback(`A verification email has been sent to ${email}.`);
    } catch (error) {
      setFeedback(toFirebaseAuthErrorMessage(error, 'Unable to send a verification email right now.'));
    } finally {
      setSending(false);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshing(true);
    setFeedback(null);

    try {
      const user = firebaseUser ?? getFirebaseAuthClient().currentUser;
      if (!user) {
        throw new Error('Sign in again to refresh your verification status.');
      }

      await reload(user);
      if (!user.emailVerified) {
        setFeedback('Your email is still pending verification. Open the link in your inbox, then refresh status again.');
        return;
      }

      await refreshServerSession(user);
      setEmailVerified(true);
      setFeedback('Email verified successfully.');
      router.refresh();
    } catch (error) {
      setFeedback(toFirebaseAuthErrorMessage(error, 'Unable to refresh your verification status right now.'));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="stack-list" style={{ gap: 12 }}>
      <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="stack-list" style={{ gap: 4 }}>
          <strong>{email}</strong>
          <span className="muted">Email address</span>
        </div>
        <div className="action-list">
          <VerificationBadge verified={emailVerified} label="Pending" />
          {!emailVerified ? (
            <>
              <button className="btn btn-ghost" type="button" disabled={sending || !firebaseReady} onClick={handleSendEmailVerification}>
                {sending ? 'Sending...' : 'Resend verification'}
              </button>
              <button className="btn btn-ghost" type="button" disabled={refreshing || !firebaseReady} onClick={handleRefreshVerification}>
                {refreshing ? 'Refreshing...' : 'Refresh status'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {feedback ? <p className="muted form-message" style={{ margin: 0 }}>{feedback}</p> : null}
    </div>
  );
}
