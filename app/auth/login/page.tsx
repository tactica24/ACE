import AuthLogin from '@/components/AuthLogin';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Sign in</h2>
          <p className="muted">Welcome back to ACE Studio.</p>
          <AuthLogin />
          <p className="muted" style={{ marginTop: 12 }}>
            New to ACE? <Link href="/auth/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}




