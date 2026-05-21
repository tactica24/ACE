import AuthRegister from '@/components/AuthRegister';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getPrimaryAppPath } from '@/lib/account-routing';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(getPrimaryAppPath(user));
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Create your account</h2>
          <p className="muted">Create your account to start watching.</p>
          <AuthRegister initialSignupIntent="VIEWER" lockSignupIntent submitLabel="Create account" />
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
