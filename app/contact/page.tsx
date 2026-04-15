import PublicInfoPage from '@/components/PublicInfoPage';

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Contact ACE Studio for support, account help, partnerships, and business enquiries."
      summary="General enquiries, support requests, and partnership conversations can be directed to info@acestudio.ng. Where account-specific support is available inside the platform, signed-in users can also use those internal routes."
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
            'For questions about sign-in, title access, playback availability, or TV pairing, contact info@acestudio.ng or use the in-platform support path attached to your account.',
            'Including your account email, device, and the title involved will help the team review the issue more efficiently.'
          ]
        },
        {
          title: 'Producers and partners',
          body: [
            'For onboarding, producer records, title management, reporting questions, or distribution discussions, include the producer or company name involved when writing to info@acestudio.ng.',
            'Partnership and investor enquiries are also routed through the same address for internal handling and follow-up.'
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
