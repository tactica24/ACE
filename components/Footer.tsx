import Link from 'next/link';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Browse', href: '/browse' },
      { label: 'Highlights', href: '/highlights' },
      { label: 'Watch on TV', href: '/tv' }
    ]
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', href: '/faq' },
      { label: 'Help Centre', href: '/help' },
      { label: 'Contact', href: '/contact' },
      { label: 'TV Pairing', href: '/tv/pair' }
    ]
  },
  {
    title: 'Business',
    links: [
      { label: 'About ACE Studio', href: '/about' },
      { label: 'Partnership Enquiries', href: '/partners' },
      { label: 'Privacy Notice', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' }
    ]
  }
];

const footerHighlights = [
  'Account-based access across supported screens',
  'Connected TV pairing for living-room playback',
  'Professional support for viewers, producers, and partners'
];

type FooterProps = {
  hidePremiumHero?: boolean;
};

export default function Footer({ hidePremiumHero = false }: FooterProps) {
  return (
    <footer className="footer footer-premium">
      <div className="container footer-premium-shell">
        {!hidePremiumHero ? (
          <section className="footer-premium-hero">
            <div className="footer-premium-copy">
              <span className="footer-premium-label">ACE Studio</span>
              <h2>Premium streaming for films and series, built to feel elegant for audiences and dependable for rightsholders, partners, and operators.</h2>
              <p className="muted">
                ACE Studio combines curated discovery, secure account-based access, connected TV playback, and the operational infrastructure needed to programme titles, onboard producers, support partners, and run a premium entertainment platform with confidence.
              </p>
              <div className="footer-app-buttons">
                <Link className="btn btn-primary btn-compact" href="/tv">
                  Watch on TV
                </Link>
                <Link className="btn btn-ghost btn-compact" href="/faq">
                  Open FAQ
                </Link>
              </div>
            </div>

            <div className="footer-premium-side">
              <div className="footer-premium-panel">
                <span className="footer-premium-kicker">Viewing confidence</span>
                <div className="footer-premium-list">
                  {footerHighlights.map((item) => (
                    <div key={item} className="footer-premium-item">
                      <span className="footer-premium-bullet" aria-hidden="true" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="footer-premium-panel footer-premium-contact">
                <span className="footer-premium-kicker">Contact</span>
                <strong>info@acestudio.ng</strong>
                <p className="muted">
                  For support, producer onboarding, partnership enquiries, and business discussions.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="footer-link-deck">
          {footerGroups.map((group) => (
            <div key={group.title} className="footer-link-panel">
              <h3>{group.title}</h3>
              <div className="footer-column">
                {group.links.map((link) => (
                  <Link key={link.label} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="footer-legal">
          <span>(c) {new Date().getFullYear()} ACE Studio. All rights reserved.</span>
          <span className="muted">Business and support enquiries: info@acestudio.ng</span>
        </div>
      </div>
    </footer>
  );
}
