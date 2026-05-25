import PublicInfoPage from '@/components/PublicInfoPage';

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Contact ACE Studio."
      summary="For support, account help, partnerships, producer questions, or business enquiries, email info@acestudio.ng. Signed-in users can also use the account support routes inside the platform."
      ctaLabel="Email info@acestudio.ng"
      ctaHref="mailto:info@acestudio.ng"
      secondaryLabel="Open FAQ"
      secondaryHref="/faq"
      facts={[
        { label: 'Support', value: 'Account, playback, and access help' },
        { label: 'Business', value: 'Partnership and investor enquiries' },
        { label: 'Response path', value: 'Centralized through info@acestudio.ng' }
      ]}
      quickLinks={[
        { label: 'FAQ', href: '/faq' },
        { label: 'Support page', href: '/help' },
        { label: 'Watch on TV', href: '/tv' }
      ]}
      sections={[
        {
          title: 'Viewer support',
          body: [
            'For sign-in, title access, playback, wallet, or TV pairing questions, contact info@acestudio.ng or use the support path attached to your account.',
            'Include your account email, device, browser, and title name so the issue can be reviewed quickly.'
          ]
        },
        {
          title: 'Producers and partners',
          body: [
            'For onboarding, producer records, title management, reporting, or distribution discussions, include the producer or company name involved.',
            'Partnership and investor enquiries are routed through the same address for internal review and follow-up.'
          ]
        },
        {
          title: 'What to include',
          body: [
            'A short explanation of the issue or request, the account email involved, and any relevant title or device details will usually speed up triage.',
            'Where the request concerns a business discussion, it helps to include the organization, the type of enquiry, and the expected next step.'
          ]
        }
      ]}
    />
  );
}
