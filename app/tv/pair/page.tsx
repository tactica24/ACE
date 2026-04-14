import Link from 'next/link';
import TvPairingClaim from '@/components/TvPairingClaim';
import { getCurrentUser } from '@/lib/auth';

export default async function TvPairPage() {
  const user = await getCurrentUser();

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <div className="pill">Ace Studio TV Pairing</div>
          <h1 className="hero-title" style={{ margin: 0 }}>Link a TV screen to your ACE Studio account</h1>
          <p className="muted" style={{ margin: 0 }}>
            Enter the pairing code shown on the TV screen{user ? '.' : '. If you are not signed in yet, sign in first and return to complete the link.'}
          </p>
          <TvPairingClaim />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {!user ? (
              <Link className="btn btn-primary" href="/auth/login?next=/tv/pair">
                Sign in
              </Link>
            ) : null}
            <Link className="btn btn-ghost" href="/browse">
              Browse catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
