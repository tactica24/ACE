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
  const submitted = searchParams?.submitted === '1';
  const verificationSent = searchParams?.verification === 'sent';

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
    const readyForOnboarding = user.creatorAccessStatus === 'INVITED' || user.creatorAccessStatus === 'SUBMITTED';

    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="card">
            <h2>{readyForOnboarding ? 'Creator access is ready' : 'Creator request submitted'}</h2>
            <p className="muted">
              {readyForOnboarding
                ? 'Your creator access has been opened. Continue to onboarding and complete your studio profile.'
                : 'Your application is under review. Once approved, you can continue into creator onboarding.'}
            </p>
            {submitted || verificationSent ? (
              <p className="muted">Your account has been created and your application has been received.</p>
            ) : null}
            <div className="action-list" style={{ marginTop: 16 }}>
              <Link className="btn btn-primary" href={readyForOnboarding ? '/studio/onboarding' : '/account'}>
                {readyForOnboarding ? 'Continue onboarding' : 'View account status'}
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
            Start your creator account here. After signup, your application will be reviewed before studio access is opened.
          </p>
          <AuthRegister
            initialSignupIntent="CREATOR"
            lockSignupIntent
            submitLabel="Request creator access"
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
