import Link from 'next/link';

type PublicInfoSection = {
  title: string;
  body: string[];
};

export default function PublicInfoPage({
  eyebrow,
  title,
  summary,
  sections,
  ctaLabel = 'Browse catalog',
  ctaHref = '/browse'
}: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: PublicInfoSection[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="section">
      <div className="container">
        <div className="info-page-hero">
          <span className="pill">{eyebrow}</span>
          <h1 className="hero-title" style={{ margin: '14px 0 10px' }}>{title}</h1>
          <p className="muted info-page-summary">{summary}</p>
          <div className="home-actions">
            <Link className="btn btn-primary" href={ctaHref}>{ctaLabel}</Link>
            <Link className="btn btn-ghost" href="/contact">Contact ACE Studio</Link>
          </div>
        </div>

        <div className="info-page-grid">
          {sections.map((section) => (
            <article key={section.title} className="card info-page-card">
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="muted">{paragraph}</p>
              ))}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
