import Link from 'next/link';

const platformLinks = [
  { label: 'Home', href: '/' },
  { label: 'Browse', href: '/browse' },
  { label: 'Highlights', href: '/highlights' },
  { label: 'Watch on TV', href: '/tv' },
  { label: 'FAQ', href: '/faq' }
];

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Partnership Enquiries', href: '/partners' },
  { label: 'Support', href: '/help' }
];

const legalLinks = [
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Privacy Notice', href: '/privacy' }
];

export default function Footer() {
  return (
    <footer className="footer footer-premium">
      <div className="container footer-grid">
        <div className="footer-brand-block">
          <strong className="footer-brand">Ace Studio</strong>
          <p className="muted footer-brand-copy">
            ACE Studio is a streaming platform for film and series discovery across web, mobile, and connected TV, with integrated tools for viewers, producers, and business partners.
          </p>
          <div className="footer-app-buttons">
            <Link className="btn btn-ghost btn-compact" href="/tv">Open TV mode</Link>
            <Link className="btn btn-ghost btn-compact" href="/tv/pair">Pair a screen</Link>
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
        <span className="muted">Business enquiries: info@acestudio.ng</span>
      </div>
    </footer>
  );
}
