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
  phone,
  initialEmailVerified
}: {
  email: string;
  phone: string;
  initialEmailVerified: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailVerified, setEmailVerified] = useState(initialEmailVerified);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const verificationState = searchParams.get('verification');
    if (verificationState === 'sent') {
      setFeedback('Verification email sent. Open your inbox, confirm the link, then refresh status here.');
    } else if (verificationState === 'required') {
      setFeedback('Verify your email address to unlock movies, fund your wallet, and complete creator submission.');
    } else if (verificationState === 'email') {
      setFeedback('Email verification confirmed. Refreshing your account status...');
    }
  }, [searchParams]);

  useEffect(() => {
    const firebaseAuth = getFirebaseAuthClient();

    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        return;
      }

      setPhoneVerified(Boolean(user.phoneNumber));
      if (emailVerified) {
        return;
      }

      await user.reload().catch(() => null);
      setPhoneVerified(Boolean(user.phoneNumber));
      if (!user.emailVerified) {
        return;
      }

      try {
        await refreshServerSession(user);
        setEmailVerified(true);
        setFeedback('Email verified successfully.');
        router.refresh();
      } catch (error) {
        setFeedback(toFirebaseAuthErrorMessage(error, 'Email verification succeeded, but the account session could not be refreshed yet.'));
      }
    });
  }, [emailVerified, router]);

  const handleSendEmailVerification = async () => {
    setSending(true);
    setFeedback(null);

    try {
      const user = getFirebaseAuthClient().currentUser;
      if (!user) {
        throw new Error('Sign in again to send a fresh verification email.');
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
      const user = getFirebaseAuthClient().currentUser;
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
              <button className="btn btn-ghost" type="button" disabled={sending} onClick={handleSendEmailVerification}>
                {sending ? 'Sending...' : 'Verify email'}
              </button>
              <button className="btn btn-ghost" type="button" disabled={refreshing} onClick={handleRefreshVerification}>
                {refreshing ? 'Refreshing...' : 'Refresh status'}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="stack-row" style={{ alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div className="stack-list" style={{ gap: 4 }}>
          <strong>{phone}</strong>
          <span className="muted">Phone number</span>
        </div>
        <div className="action-list">
          <VerificationBadge verified={phoneVerified} label="Pending SMS verification" />
        </div>
      </div>

      <p className="muted" style={{ margin: 0 }}>
        Phone verification should use secure SMS OTP, not an email-style link, so this dashboard now shows the correct pending state until a verified phone credential is linked.
      </p>
      {feedback ? <p className="muted form-message" style={{ margin: 0 }}>{feedback}</p> : null}
    </div>
  );
}
