export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function DownloadPage() {
  const downloadHref = `/api/mobile/android-apk?t=${Date.now()}`;

  return (
    <div className="section">
      <div className="container detail-page">
        <div className="card">
          <span className="pill">Native Android app</span>
          <h1 className="hero-title" style={{ marginTop: 10 }}>Download ACE Studio for Android</h1>
          <p className="muted" style={{ marginTop: 10, maxWidth: 680 }}>
            Install the latest Flutter build, sign in, unlock titles once, and keep watching from the same ACE catalog and playback flow used on the web.
          </p>
          <div className="action-list" style={{ marginTop: 14 }}>
            <a className="btn btn-primary" href={downloadHref}>
              Click to start downloading
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
