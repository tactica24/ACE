import Link from 'next/link';

type PublicInfoSection = {
  title: string;
  body: string[];
  note?: string;
};

type PublicInfoFact = {
  label: string;
  value: string;
};

type PublicInfoQuickLink = {
  label: string;
  href: string;
};

export default function PublicInfoPage({
  eyebrow,
  title,
  summary,
  sections = [],
  ctaLabel = 'Browse catalog',
  ctaHref = '/browse',
  secondaryLabel = 'Contact ACE Studio',
  secondaryHref = '/contact',
  facts = [],
  quickLinks = [
    { label: 'FAQ', href: '/faq' },
    { label: 'Watch on TV', href: '/tv' },
    { label: 'Contact', href: '/contact' }
  ]
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections?: PublicInfoSection[];
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  facts?: PublicInfoFact[];
  quickLinks?: PublicInfoQuickLink[];
}) {
  return (
    <div className="section">
      <div className="container info-page-shell">
        <section className="info-page-hero-panel">
          <div className="info-page-hero-copy">
            <span className="pill">{eyebrow}</span>
            <h1 className="info-page-title">{title}</h1>
            <p className="muted info-page-summary">{summary}</p>
            <div className="home-actions">
              <Link className="btn btn-primary" href={ctaHref}>
                {ctaLabel}
              </Link>
              <Link className="btn btn-ghost" href={secondaryHref}>
                {secondaryLabel}
              </Link>
            </div>
          </div>

          <aside className="info-page-hero-side">
            <div className="info-page-feature-card">
              <span className="info-page-kicker">Connected viewing</span>
              <strong>Web, mobile, and TV-linked playback on one account.</strong>
              <p className="muted">
                ACE Studio is structured for clear discovery, account-based access, and a consistent viewing journey across screens.
              </p>
            </div>
            <div className="info-page-feature-card info-page-feature-card-soft">
              <span className="info-page-kicker">Need help?</span>
              <strong>Support and business enquiries</strong>
              <p className="muted">
                For platform support, producer questions, partnerships, or investor conversations, contact info@acestudio.ng.
              </p>
            </div>
          </aside>
        </section>

        {facts.length ? (
          <section className="info-page-fact-strip">
            {facts.map((fact) => (
              <article key={`${fact.label}-${fact.value}`} className="info-page-fact-card">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </article>
            ))}
          </section>
        ) : null}

        <section className="info-page-body">
          {sections.length ? (
            <div className="info-page-main">
              {sections.map((section, index) => (
                <article key={section.title} className="info-page-section-card">
                  <div className="info-page-section-header">
                    <span className="info-page-section-index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h2>{section.title}</h2>
                      {section.note ? <p className="muted info-page-section-note">{section.note}</p> : null}
                    </div>
                  </div>
                  <div className="info-page-section-copy">
                    {section.body.map((paragraph) => (
                      <p key={paragraph} className="muted">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <aside className="info-page-rail">
            <div className="info-page-rail-card">
              <span className="info-page-kicker">Quick access</span>
              <div className="info-page-quick-links">
                {quickLinks.map((link) => (
                  <Link key={link.label} href={link.href} className="info-page-quick-link">
                    <span>{link.label}</span>
                    <span aria-hidden="true">Open</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="info-page-rail-card info-page-rail-highlight">
              <span className="info-page-kicker">TV pairing</span>
              <strong>Move from phone to screen without starting over.</strong>
              <p className="muted">
                Use the ACE Studio TV code flow to authorize a living-room screen with the same account that manages your viewing access.
              </p>
              <Link className="btn btn-ghost btn-compact" href="/tv/pair">
                Link a screen
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
