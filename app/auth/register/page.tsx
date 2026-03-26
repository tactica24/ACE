import AuthRegister from '@/components/AuthRegister';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Create your Ace Studio account</h2>
          <p className="muted">Unlock, publish, and monetize. Please confirm your email before using wallet funding, unlocks, or creator tools.</p>
          <AuthRegister />
          <p className="muted" style={{ marginTop: 12 }}>
            Already have an account? <Link href="/auth/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}




