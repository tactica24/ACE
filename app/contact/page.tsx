import PublicInfoPage from '@/components/PublicInfoPage';

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Contact ACE Studio for support, partnerships, or business enquiries."
      summary="General enquiries, partnership requests, and support issues can be directed to info@acestudio.ng. Platform users can also use the in-product support routes where available."
      ctaLabel="Email info@acestudio.ng"
      ctaHref="mailto:info@acestudio.ng"
      sections={[
        {
          title: 'Viewer support',
          body: [
            'For questions about account access, playback, title availability, or TV pairing, contact info@acestudio.ng or use the support path inside your account.',
            'Including your account email, device, and the title involved will help the team respond faster.'
          ]
        },
        {
          title: 'Producers and partners',
          body: [
            'For onboarding, catalog discussions, reporting questions, or title management support, contact info@acestudio.ng and include the company or producer name involved.',
            'Partnership and investor enquiries are also routed through the same address for internal handling.'
          ]
        }
      ]}
    />
  );
}
