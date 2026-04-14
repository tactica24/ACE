import Link from 'next/link';

const faqGroups = [
  {
    title: 'For viewers',
    items: [
      {
        question: 'How do I unlock or gain access to a title?',
        answer:
          'Access is managed through your ACE Studio account. Where a title requires payment or a package, that transaction is completed on the website and the resulting access is applied to the same account.'
      },
      {
        question: 'I signed in but a title is still unavailable. What should I do?',
        answer:
          'First confirm that you are signed in with the correct account. If the issue remains, contact support at info@acestudio.ng with the title name and the account email involved.'
      },
      {
        question: 'Can I watch on my TV?',
        answer:
          'Yes. ACE Studio includes a TV pairing flow. Open the TV page to generate a pairing code, then visit the pairing page on your phone, enter the code, and the TV session will sign in automatically.'
      }
    ]
  },
  {
    title: 'For producers',
    items: [
      {
        question: 'Can ACE Studio create a producer account directly from admin?',
        answer:
          'Yes. Admin can now create an approved producer record directly from the dashboard, generate a unique producer code immediately, and upload titles under that producer ID.'
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
    title: 'For partners and investors',
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
      <div className="container">
        <div className="info-page-hero">
          <span className="pill">FAQ</span>
          <h1 className="hero-title" style={{ margin: '14px 0 10px' }}>
            Frequently asked questions about ACE Studio
          </h1>
          <p className="muted info-page-summary">
            This page answers the most common questions from viewers, producers, partners, and investors. For anything not covered here, contact info@acestudio.ng.
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

        <div className="faq-group-list">
          {faqGroups.map((group) => (
            <section key={group.title} className="card info-page-card">
              <h2>{group.title}</h2>
              <div className="faq-list">
                {group.items.map((item) => (
                  <div key={item.question} className="faq-item">
                    <strong>{item.question}</strong>
                    <p className="muted">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
