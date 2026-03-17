import Link from 'next/link';
import TvPairingClaim from '@/components/TvPairingClaim';

export default function TvPairPage() {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card" style={{ display: 'grid', gap: 16 }}>
          <div className="pill">Ace Studio TV Pairing</div>
          <h1 className="hero-title" style={{ margin: 0 }}>Link your TV in seconds</h1>
          <p className="muted" style={{ margin: 0 }}>
            Enter the pairing code showing on your TV. If you are not signed in yet, sign in first and come right back.
          </p>
          <TvPairingClaim />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary" href="/auth/login?next=/tv/pair">
              Sign in
            </Link>
            <Link className="btn btn-ghost" href="/browse">
              Browse catalog
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
