export const dynamic = 'force-dynamic';

export default function DownloadPage() {
  return (
    <div className="section">
      <div className="container detail-page">
        <div className="card">
          <span className="pill">Native Android app</span>
          <h1 className="hero-title" style={{ marginTop: 10 }}>Download ACE Studio for Android</h1>
          <div className="action-list" style={{ marginTop: 14 }}>
            <a className="btn btn-primary" href="/api/mobile/android-apk">
              Click to start downloading
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
