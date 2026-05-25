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
    <div className="section info-page-section">
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

        <section className={`info-page-body${sections.length ? '' : ' info-page-body-links-only'}`}>
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
          </aside>
        </section>
      </div>
    </div>
  );
}
