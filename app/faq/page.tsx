import Link from 'next/link';

const faqGroups = [
  {
    title: 'Viewer questions',
    note: 'Access, playback, and connected-device viewing.',
    items: [
      {
        question: 'How do I unlock or gain access to a title?',
        answer:
          'Access is managed through your ACE Studio account. Where a title requires payment or a package, the transaction is completed on the website and the resulting access is applied to that same account.'
      },
      {
        question: 'I signed in but a title is still unavailable. What should I do?',
        answer:
          'First confirm that you are signed in with the correct account. If the issue remains, contact support at info@acestudio.ng and include the title name and account email involved.'
      },
      {
        question: 'Can I watch on my TV?',
        answer:
          'Yes. ACE Studio includes a TV pairing flow. Open the TV page to generate a pairing code, then visit the pairing page on your phone, enter the code, and the TV session will sign in automatically.'
      }
    ]
  },
  {
    title: 'Producer questions',
    note: 'Admin-created producer records and title ownership.',
    items: [
      {
        question: 'Can ACE Studio create a producer account directly from admin?',
        answer:
          'Yes. Admin can create an approved producer record directly from the dashboard, generate a unique producer code immediately, and upload titles under that producer ID.'
      },
      {
        question: 'Why does the producer code matter?',
        answer:
          'The producer code anchors the producer profile and keeps uploaded titles, reporting records, and administrative references tied to the same producer account.'
      },
      {
        question: 'Can a producer later sign in with that record?',
        answer:
          "Yes. The admin-created producer record establishes the platform account. It can later be aligned with the producer's sign-in identity using the same account details."
      }
    ]
  },
  {
    title: 'Partner and investor questions',
    note: 'Business, licensing, and strategic conversations.',
    items: [
      {
        question: 'Can I discuss partnership or investment opportunities?',
        answer:
          'Yes. ACE Studio accepts partnership and investor enquiries. Send a short introduction and the purpose of your enquiry to info@acestudio.ng.'
      },
      {
        question: 'What kinds of partnerships are relevant?',
        answer:
          'Relevant discussions may include content licensing, platform distribution, commercial collaborations, technology partnerships, and strategic growth conversations.'
      }
    ]
  }
];

export default function FaqPage() {
  return (
    <div className="section">
      <div className="container info-page-shell">
        <section className="info-page-hero-panel">
          <div className="info-page-hero-copy">
            <span className="pill">FAQ</span>
            <h1 className="hero-title info-page-title">Frequently asked questions about ACE Studio</h1>
            <p className="muted info-page-summary">
              This page answers common questions from viewers, producers, partners, and investors. For anything not covered here, contact info@acestudio.ng.
            </p>
            <div className="home-actions">
              <Link className="btn btn-primary" href="mailto:info@acestudio.ng">
                Email info@acestudio.ng
              </Link>
              <Link className="btn btn-ghost" href="/tv">
                Watch on TV
              </Link>
            </div>
          </div>

          <aside className="info-page-hero-side">
            <div className="info-page-feature-card">
              <span className="info-page-kicker">Account access</span>
              <strong>One account, connected access across supported screens.</strong>
              <p className="muted">
                Website actions, entitled access, and TV-linked viewing all resolve against the same ACE Studio account.
              </p>
            </div>
            <div className="info-page-feature-card info-page-feature-card-soft">
              <span className="info-page-kicker">Business contact</span>
              <strong>info@acestudio.ng</strong>
              <p className="muted">
                Use this address for support, producer onboarding, partnership discussions, and investor introductions.
              </p>
            </div>
          </aside>
        </section>

        <section className="info-page-fact-strip">
          <article className="info-page-fact-card">
            <span>Support</span>
            <strong>Account, access, and playback guidance</strong>
          </article>
          <article className="info-page-fact-card">
            <span>Producers</span>
            <strong>Admin-created producer records and title ownership</strong>
          </article>
          <article className="info-page-fact-card">
            <span>Business</span>
            <strong>Partnership, licensing, and investor conversations</strong>
          </article>
        </section>

        <section className="info-page-body">
          <div className="info-page-main">
            {faqGroups.map((group, index) => (
              <article key={group.title} className="info-page-section-card">
                <div className="info-page-section-header">
                  <span className="info-page-section-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h2>{group.title}</h2>
                    <p className="muted info-page-section-note">{group.note}</p>
                  </div>
                </div>

                <div className="faq-list">
                  {group.items.map((item) => (
                    <div key={item.question} className="faq-item">
                      <strong>{item.question}</strong>
                      <p className="muted">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <aside className="info-page-rail">
            <div className="info-page-rail-card">
              <span className="info-page-kicker">Quick links</span>
              <div className="info-page-quick-links">
                <Link href="/help" className="info-page-quick-link">
                  <span>Help Centre</span>
                  <span aria-hidden="true">Open</span>
                </Link>
                <Link href="/contact" className="info-page-quick-link">
                  <span>Contact</span>
                  <span aria-hidden="true">Open</span>
                </Link>
                <Link href="/tv/pair" className="info-page-quick-link">
                  <span>TV pairing</span>
                  <span aria-hidden="true">Open</span>
                </Link>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
