import AuthLogin from '@/components/AuthLogin';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getPrimaryAppPath(user));
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Sign in</h2>
          <p className="muted">Welcome back to Ace Studio.</p>
          <AuthLogin />
          <p className="muted" style={{ marginTop: 12 }}>
            New to Ace Studio? <Link href="/auth/register">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
