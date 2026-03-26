import AuthRegister from '@/components/AuthRegister';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Create your account</h2>
          <p className="muted">Open your viewer account and go straight into the catalog.</p>
          <AuthRegister initialSignupIntent="VIEWER" lockSignupIntent submitLabel="Create viewer account" />
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}




