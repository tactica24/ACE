import PublicInfoPage from '@/components/PublicInfoPage';

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Support"
      title="Get help with access, playback, account questions, and platform use."
      summary="The support page is the public reference point for common platform issues. For quick answers, review the FAQ. For direct assistance, email info@acestudio.ng."
      ctaLabel="Open FAQ"
      ctaHref="/faq"
      sections={[
        {
          title: 'Common viewer issues',
          body: [
            'Most support requests relate to sign-in, title access, playback availability, or device-specific viewing issues.',
            'The FAQ explains the core flows, including account access, website unlocks, and TV pairing.'
          ]
        },
        {
          title: 'Direct support',
          body: [
            'If the FAQ does not resolve the issue, contact info@acestudio.ng with a short description of the problem, your account email, and any relevant title or device details.',
            'For signed-in users, in-product support channels remain the best place for tracked account-specific requests.'
          ]
        }
      ]}
    />
  );
}
