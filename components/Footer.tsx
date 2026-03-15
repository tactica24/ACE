export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid">
          <div>
            <strong>ACE Studio</strong>
            <p className="muted">African Content Economy. Built for creators who want margin, speed, and control.</p>
          </div>
          <div>
            <strong>Pricing</strong>
            <p className="muted">NGN 100 Snack · NGN 200 Standard · NGN 500 Premiere</p>
          </div>
          <div>
            <strong>Security</strong>
            <p className="muted">Signed URLs, dynamic watermarking, encrypted .ace offline unlocks.</p>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 24 }}>© {new Date().getFullYear()} ACE Studio. Lagos Relay Ready.</p>
      </div>
    </footer>
  );
}



