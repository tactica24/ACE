import PublicInfoPage from '@/components/PublicInfoPage';

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Help Centre"
      title="Get help with access, playback, account questions, and connected-device viewing."
      summary="This page is the public reference point for common ACE Studio support topics. For quick answers, review the FAQ. For direct assistance, email info@acestudio.ng."
      ctaLabel="Open FAQ"
      ctaHref="/faq"
      secondaryLabel="Contact support"
      secondaryHref="mailto:info@acestudio.ng"
      facts={[
        { label: 'Viewer support', value: 'Access, playback, and device help' },
        { label: 'Reference', value: 'FAQ and public guidance pages' },
        { label: 'Escalation', value: 'Direct support via info@acestudio.ng' }
      ]}
      quickLinks={[
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact support', href: '/contact' },
        { label: 'TV pairing', href: '/tv/pair' }
      ]}
      sections={[
        {
          title: 'Common support topics',
          body: [
            'Most support requests relate to sign-in, title access, playback availability, or device-specific viewing issues.',
            'The FAQ explains the core flows, including account access, website-based unlocks, and TV pairing.'
          ]
        },
        {
          title: 'Direct support',
          body: [
            'If the FAQ does not resolve the issue, contact info@acestudio.ng with a short description of the problem, your account email, and any relevant title or device details.',
            'For signed-in users, in-product support channels remain the best place for tracked, account-specific requests.'
          ]
        },
        {
          title: 'Access reminders',
          body: [
            'If a title is unavailable on your account, first confirm that you are signed in with the correct email and that the relevant access is attached to that same account.',
            'If the issue remains unresolved, include the title name and any recent account activity in your support message so the team can trace it accurately.'
          ]
        }
      ]}
    />
  );
}
