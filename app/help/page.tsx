import PublicInfoPage from '@/components/PublicInfoPage';

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Help Centre"
      title="Support for accounts, access, playback, and TV viewing."
      summary="Use this page for common ACE Studio support topics. For quick answers, open the FAQ. For direct assistance, email info@acestudio.ng with your account email, device, and the title involved."
      ctaLabel="Open FAQ"
      ctaHref="/faq"
      secondaryLabel="Contact support"
      secondaryHref="mailto:info@acestudio.ng"
      quickLinks={[
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact support', href: '/contact' },
        { label: 'TV pairing', href: '/tv/pair' }
      ]}
      sections={[
        {
          title: 'Playback and access',
          body: [
            'If a title does not start, refresh the page, confirm that you are signed in, and check that the title has been unlocked on the same account.',
            'When contacting support, include the title name, your account email, device type, browser, and what happened after pressing play.'
          ]
        },
        {
          title: 'Account help',
          body: [
            'For sign-in, wallet, unlock, or account questions, write from the email connected to your ACE Studio account whenever possible.',
            'Do not send passwords or sensitive payment details. The support team only needs enough information to identify the account and reproduce the issue.'
          ]
        },
        {
          title: 'TV and mobile',
          body: [
            'TV viewing uses a pairing code so a signed-in device can authorize the larger screen.',
            'Mobile downloads and app-specific issues should include the phone model, Android version, and the title or page where the issue occurred.'
          ]
        }
      ]}
    />
  );
}
