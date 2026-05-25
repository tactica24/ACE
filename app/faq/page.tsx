import Link from 'next/link';

const faqGroups = [
  {
    title: 'User questions',
    note: 'Account access, payments, playback, downloads, and connected-device viewing.',
    items: [
      {
        question: 'What is ACE Studio for users?',
        answer:
          'ACE Studio is a viewing platform where users can browse available titles, sign in, unlock access where required, and watch on supported devices.'
      },
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
        question: 'Can I download the Android app?',
        answer:
          'Yes. Visit the Android app download page from the website navigation. If the download does not start, email info@acestudio.ng with your device model and the page where the issue happened.'
      },
      {
        question: 'Can I download titles for offline viewing?',
        answer:
          'Offline downloads are available inside the mobile app for supported, unlocked titles. Downloaded titles remain linked to the signed-in profile on that device.'
      },
      {
        question: 'Why is playback not starting or stopping midway?',
        answer:
          'Check your internet connection, refresh the title page, and confirm that you are still signed in. If playback keeps failing, send the title name, device type, and your account email to info@acestudio.ng.'
      },
      {
        question: 'Can I watch on my TV?',
        answer:
          'Yes. ACE Studio includes a TV pairing flow. Open the TV page to generate a pairing code, then visit the pairing page on any signed-in device, enter the code, and the TV session will sign in automatically.'
      },
      {
        question: 'What should I do if TV pairing does not work?',
        answer:
          'Make sure the code is entered before it expires and that the pairing device is signed in to the correct ACE Studio account. If the code still fails, start a new pairing session on the TV screen.'
      },
      {
        question: 'How do I get help with my account?',
        answer:
          'Email info@acestudio.ng from the email address on your ACE Studio account and include a short description of the issue. Do not include your password.'
      },
      {
        question: 'Where should I send additional questions?',
        answer:
          'If your question is not answered here, contact info@acestudio.ng and include enough detail for the support team to understand what you were trying to do.'
      }
    ]
  }
];

export default function FaqPage() {
  return (
    <div className="section info-page-section">
      <div className="container info-page-shell">
        <section className="info-page-hero-panel">
          <div className="info-page-hero-copy">
            <span className="pill">FAQ</span>
            <h1 className="info-page-title">ACE Studio FAQ.</h1>
            <p className="muted info-page-summary">
              Clear answers for account access, title unlocks, playback, downloads, and TV pairing. For anything not covered here, contact info@acestudio.ng.
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
