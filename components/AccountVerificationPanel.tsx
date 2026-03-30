'use client';

import {
  PhoneAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  type User as FirebaseUser
} from 'firebase/auth';
import { useEffect, useRef, useState } from 'react';
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

function normalizePhone(value?: string | null) {
  return value?.trim().replace(/(?!^\+)[^\d]/g, '') ?? '';
}

function hasMatchingVerifiedPhone(firebasePhone?: string | null, accountPhone?: string | null) {
  const normalizedFirebasePhone = normalizePhone(firebasePhone);
  const normalizedAccountPhone = normalizePhone(accountPhone);
  return Boolean(normalizedFirebasePhone && normalizedAccountPhone && normalizedFirebasePhone === normalizedAccountPhone);
}

export default function AccountVerificationPanel({
  email,
  phone,
  initialEmailVerified,
  initialPhoneVerified
}: {
  email: string;
  phone: string;
  initialEmailVerified: boolean;
  initialPhoneVerified: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [emailVerified, setEmailVerified] = useState(initialEmailVerified);
  const [phoneVerified, setPhoneVerified] = useState(initialPhoneVerified);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneVerificationId, setPhoneVerificationId] = useState<string | null>(null);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [confirmingPhoneCode, setConfirmingPhoneCode] = useState(false);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);

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
      if (!user) {
        return;
      }

      void (async () => {
        await user.reload().catch(() => null);
        if (!active) {
          return;
        }

        const linkedPhoneVerified = hasMatchingVerifiedPhone(user.phoneNumber, phone);
        if (linkedPhoneVerified) {
          setPhoneVerified(true);
        }

        const needsEmailRefresh = !emailVerified && user.emailVerified;
        const needsPhoneRefresh = linkedPhoneVerified && !phoneVerified;
        if (!needsEmailRefresh && !needsPhoneRefresh) {
          return;
        }

        try {
          await refreshServerSession(user);
          if (!active) {
            return;
          }
          if (needsEmailRefresh) {
            setEmailVerified(true);
          }
          if (needsPhoneRefresh) {
            setPhoneVerified(true);
          }
          setFeedback(
            needsEmailRefresh && needsPhoneRefresh
              ? 'Email and phone verified successfully.'
              : needsPhoneRefresh
                ? 'Phone number verified successfully.'
                : 'Email verified successfully.'
          );
          router.refresh();
        } catch (error) {
          setFeedback(
            toFirebaseAuthErrorMessage(
              error,
              needsPhoneRefresh
                ? 'Phone verification succeeded, but the account session could not be refreshed yet.'
                : 'Email verification succeeded, but the account session could not be refreshed yet.'
            )
          );
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [emailVerified, phone, phoneVerified, router]);

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  const getRecaptchaVerifier = () => {
    if (recaptchaRef.current) {
      return recaptchaRef.current;
    }

    const verifier = new RecaptchaVerifier(getFirebaseAuthClient(), 'phone-verification-recaptcha', {
      size: 'invisible'
    });
    recaptchaRef.current = verifier;
    return verifier;
  };

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

  const handleSendPhoneVerification = async () => {
    setSendingPhoneCode(true);
    setFeedback(null);

    try {
      const auth = getFirebaseAuthClient();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Sign in again to verify your phone number.');
      }
      if (!phone) {
        throw new Error('Add a phone number to your account first.');
      }
      if (hasMatchingVerifiedPhone(user.phoneNumber, phone)) {
        await refreshServerSession(user);
        setPhoneVerified(true);
        setFeedback('This phone number is already verified on your account.');
        router.refresh();
        return;
      }
      if (user.phoneNumber && !hasMatchingVerifiedPhone(user.phoneNumber, phone)) {
        throw new Error('Your current sign-in session is linked to a different phone number. Update your account phone number first or contact support for help.');
      }

      const verifier = getRecaptchaVerifier();
      const provider = new PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(phone, verifier);

      setPhoneCode('');
      setPhoneVerificationId(verificationId);
      setFeedback(`We sent a verification code to ${phone}. Enter it below to finish phone verification.`);
    } catch (error) {
      setFeedback(toFirebaseAuthErrorMessage(error, 'Unable to start phone verification right now.'));
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const handleConfirmPhoneVerification = async () => {
    setConfirmingPhoneCode(true);
    setFeedback(null);

    try {
      const user = getFirebaseAuthClient().currentUser;
      if (!user || !phoneVerificationId) {
        throw new Error('Start phone verification again to continue.');
      }
      if (!phoneCode.trim()) {
        throw new Error('Enter the verification code that was sent to your phone.');
      }

      const credential = PhoneAuthProvider.credential(phoneVerificationId, phoneCode.trim());
      await linkWithCredential(user, credential);
      await reload(user);
      await refreshServerSession(user);
      setPhoneVerified(true);
      setPhoneCode('');
      setPhoneVerificationId(null);
      setFeedback('Phone number verified successfully.');
      router.refresh();
    } catch (error) {
      setFeedback(toFirebaseAuthErrorMessage(error, 'Unable to confirm that verification code right now.'));
    } finally {
      setConfirmingPhoneCode(false);
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
          <VerificationBadge verified={phoneVerified} label="Not verified" />
          {!phoneVerified ? (
            <button className="btn btn-ghost" type="button" disabled={sendingPhoneCode} onClick={handleSendPhoneVerification}>
              {sendingPhoneCode ? 'Sending code...' : phoneVerificationId ? 'Resend code' : 'Verify phone'}
            </button>
          ) : null}
        </div>
      </div>

      {!phoneVerified && phoneVerificationId ? (
        <div className="field-grid field-grid-2">
          <label className="field">
            <span className="field-label">Verification code</span>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={phoneCode}
              onChange={(event) => setPhoneCode(event.target.value)}
              placeholder="Enter SMS code"
            />
          </label>
          <div className="field" style={{ alignSelf: 'end' }}>
            <button className="btn btn-primary" type="button" disabled={confirmingPhoneCode} onClick={handleConfirmPhoneVerification}>
              {confirmingPhoneCode ? 'Confirming...' : 'Confirm phone'}
            </button>
          </div>
        </div>
      ) : null}

      <p className="muted" style={{ margin: 0 }}>
        Phone verification stays optional until you want to send or receive family credits or a family bundle. The verification code is sent to the same phone number already saved on your account.
      </p>
      <div id="phone-verification-recaptcha" />
      {feedback ? <p className="muted form-message" style={{ margin: 0 }}>{feedback}</p> : null}
    </div>
  );
}
