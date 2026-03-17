import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Image src="/ace-studio-mark.svg" alt="Ace Studio" width={42} height={42} />
              <strong>Ace Studio</strong>
            </div>
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
        <p className="muted" style={{ marginTop: 24 }}>© {new Date().getFullYear()} Ace Studio. Lagos Relay Ready.</p>
      </div>
    </footer>
  );
}
