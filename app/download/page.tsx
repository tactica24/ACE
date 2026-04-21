import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function DownloadPage() {
  return (
    <div className="section">
      <div className="container detail-page">
        <div className="card">
          <span className="pill">Native Android app</span>
          <h1 className="hero-title" style={{ marginTop: 10 }}>Download ACE Studio for Android</h1>
          <p className="muted">
            Install the native ACE Studio Android APK directly from the website while Play Store release is still pending.
          </p>
          <div className="action-list" style={{ marginTop: 14 }}>
            <a className="btn btn-primary" href="/api/mobile/android-apk">
              Download Android APK
            </a>
            <Link className="btn btn-ghost" href="/faq">Install help</Link>
          </div>
        </div>

        <div className="card">
          <h3>Install steps</h3>
          <ol className="muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
            <li>Tap <strong>Download Android APK</strong>.</li>
            <li>Open the downloaded file from your browser downloads.</li>
            <li>Allow install from this source if Android asks.</li>
            <li>Tap <strong>Install</strong>, then open ACE Studio.</li>
          </ol>
        </div>

        <div className="card">
          <h3>Security note</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Only download ACE Studio from acestudio.ng or another official ACE Studio link. Android may show an extra confirmation because this is not yet from Play Store.
          </p>
        </div>
      </div>
    </div>
  );
}
