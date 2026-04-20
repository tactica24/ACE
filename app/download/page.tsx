import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DownloadPage() {
  return (
    <div className="section">
      <div className="container detail-page">
        <div className="card">
          <span className="pill">Mobile app</span>
          <h1 className="hero-title" style={{ marginTop: 10 }}>Install ACE Studio on Android</h1>
          <p className="muted">
            Download the official APK directly from ACE Studio and install it on your Android phone.
          </p>
          <div className="action-list" style={{ marginTop: 14 }}>
            <a className="btn btn-primary" href="/api/mobile/android-apk">
              Download Android APK
            </a>
            <Link className="btn btn-ghost" href="/faq">Install help</Link>
          </div>
        </div>

        <div className="card">
          <h3>Quick install steps</h3>
          <ol className="muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            <li>Tap <strong>Download Android APK</strong>.</li>
            <li>Open the downloaded file from your browser downloads.</li>
            <li>Allow install from this source when Android prompts you.</li>
            <li>Tap <strong>Install</strong>, then open ACE Studio.</li>
          </ol>
        </div>

        <div className="card">
          <h3>iPhone note</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Direct website install is not available for public iOS users. iPhone distribution should continue through App Store or TestFlight.
          </p>
        </div>
      </div>
    </div>
  );
}
