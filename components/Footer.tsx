import Link from 'next/link';

const platformLinks = [
  { label: 'Home', href: '/' },
  { label: 'Browse', href: '/browse' },
  { label: 'Highlights', href: '/highlights' },
  { label: 'TV Experience', href: '/tv' }
];

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Licensing & Partners', href: '/partners' },
  { label: 'Help Center', href: '/help' }
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' }
];

export default function Footer() {
  return (
    <footer className="footer footer-premium">
      <div className="container footer-grid">
        <div className="footer-brand-block">
          <strong className="footer-brand">Ace Studio</strong>
          <p className="muted footer-brand-copy">
            Premium African and international film storytelling, designed for immersive discovery, trusted playback, and investor-ready scale.
          </p>
          <div className="footer-app-buttons">
            <Link className="btn btn-ghost btn-compact" href="/browse">Watch on Web</Link>
            <Link className="btn btn-ghost btn-compact" href="/tv/pair">Pair Your TV</Link>
          </div>
        </div>
        <div className="footer-link-columns">
          <div className="footer-column">
            <h4>Platform</h4>
            {platformLinks.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <div className="footer-column">
            <h4>Company</h4>
            {companyLinks.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </div>
          <div className="footer-column">
            <h4>Legal</h4>
            {legalLinks.map((link) => (
              <Link key={link.label} href={link.href}>{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
      <div className="container footer-legal">
        <span>(c) {new Date().getFullYear()} Ace Studio. All rights reserved.</span>
        <span className="muted">Built for bold stories from Africa to the world.</span>
      </div>
    </footer>
  );
}
