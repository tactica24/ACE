import Link from 'next/link';
import AuthRegister from '@/components/AuthRegister';
import { getCurrentUser } from '@/lib/auth';

type CreatorPageProps = {
  searchParams?: {
    submitted?: string;
    verification?: string;
  };
};

function StatusCard({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <div className="action-list" style={{ marginTop: 16 }}>
        <Link className="btn btn-primary" href={primaryHref}>
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link className="btn btn-ghost" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function CreatorPage({ searchParams }: CreatorPageProps) {
  const user = await getCurrentUser();
  const verificationSent = searchParams?.verification === 'sent';
  const submitted = searchParams?.submitted === '1';

  if (user?.role === 'ADMIN') {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <StatusCard
            title="Admin account detected"
            description="This account already has admin access. Review creator applications and approvals from the admin dashboard."
            primaryHref="/admin"
            primaryLabel="Open admin dashboard"
            secondaryHref="/account"
            secondaryLabel="Open account"
          />
        </div>
      </div>
    );
  }

  if (user?.role === 'CREATOR') {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <StatusCard
            title="Creator access is active"
            description="This account already has creator access and can go straight into the studio."
            primaryHref="/studio"
            primaryLabel="Open creator studio"
            secondaryHref="/account"
            secondaryLabel="Open account"
          />
        </div>
      </div>
    );
  }

  if (user?.signupIntent === 'CREATOR') {
    const readyForOnboarding = Boolean(user.emailVerified && user.creatorAccessStatus === 'REQUESTED');
    const waitingForReview = user.creatorAccessStatus === 'SUBMITTED';

    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card">
            <h2>
              {!user.emailVerified
                ? 'Verify your email to continue'
                : waitingForReview
                  ? 'Creator profile under review'
                  : 'Continue creator onboarding'}
            </h2>
            <p className="muted">
              {!user.emailVerified
                ? 'Open the verification email we sent, then sign in again to continue your creator onboarding.'
                : waitingForReview
                  ? 'Your profile has been submitted. Admin will review it once, approve it, and then unlock your studio upload access.'
                  : 'Your email is verified. Complete your onboarding form once so admin can review and approve your creator access.'}
            </p>
            {submitted || verificationSent ? (
              <p className="muted">
                {submitted ? 'Your creator profile is in the admin review queue.' : 'Your account has been created successfully.'}
              </p>
            ) : null}
            <div className="action-list" style={{ marginTop: 16 }}>
              <Link className="btn btn-primary" href={readyForOnboarding ? '/studio/onboarding' : '/account'}>
                {readyForOnboarding ? 'Continue onboarding' : waitingForReview ? 'Open account' : 'Open account'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">
          <h2>Create your creator account</h2>
          <p className="muted">
            Start your creator account here. After email verification, you complete onboarding once and admin reviews that profile before studio access is opened.
          </p>
          <AuthRegister
            initialSignupIntent="CREATOR"
            lockSignupIntent
            submitLabel="Create creator account"
            helperText="We will send a verification email after signup."
          />
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
