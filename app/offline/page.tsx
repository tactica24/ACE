import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="section">
      <div className="container">
        <div className="card offline-card">
          <div className="pill">Offline</div>
          <h1 className="hero-title" style={{ marginTop: 12 }}>You are offline right now.</h1>
          <p className="muted" style={{ maxWidth: '48ch' }}>
            Ace Studio saved a lightweight shell for this device, but this page needs a connection to load fresh catalog and account data.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/browse">Try catalog again</Link>
            <Link className="btn btn-ghost" href="/">Go home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
