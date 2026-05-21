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
      { label: 'Terms of Use', href: '/terms' }
    ]
  }
];

type FooterProps = {
  hideSupportEmailTagline?: boolean;
};

export default function Footer({ hideSupportEmailTagline = false }: FooterProps) {
  return (
    <footer className="footer footer-premium">
      <div className="container footer-premium-shell">
        <div className="footer-brand-row">
          <Link className="footer-brand" href="/" aria-label="ACE Studio home">
            <span className="footer-brand-ace">ACE</span>
            <span>Studio</span>
          </Link>
          <p>Premium film and series streaming for every screen.</p>
        </div>

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
          {!hideSupportEmailTagline ? <span className="muted">Business and support enquiries: info@acestudio.ng</span> : null}
        </div>
      </div>
    </footer>
  );
}
