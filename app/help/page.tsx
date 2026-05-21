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
      quickLinks={[
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact support', href: '/contact' },
        { label: 'TV pairing', href: '/tv/pair' }
      ]}
    />
  );
}
