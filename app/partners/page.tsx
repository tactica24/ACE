import PublicInfoPage from '@/components/PublicInfoPage';

export default function PartnersPage() {
  return (
    <PublicInfoPage
      eyebrow="Partnerships"
      title="ACE Studio welcomes conversations with content owners, distributors, brands, and strategic partners."
      summary="Partnership discussions can cover catalog licensing, platform distribution, commercial collaboration, and broader strategic opportunities. Initial enquiries can be sent to info@acestudio.ng."
      ctaLabel="Email partnership enquiries"
      ctaHref="mailto:info@acestudio.ng"
      secondaryLabel="About ACE Studio"
      secondaryHref="/about"
      facts={[
        { label: 'Content', value: 'Licensing and catalog distribution' },
        { label: 'Commercial', value: 'Brand and platform collaboration' },
        { label: 'Strategic', value: 'Investor and growth conversations' }
      ]}
      quickLinks={[
        { label: 'Contact', href: '/contact' },
        { label: 'About ACE Studio', href: '/about' },
        { label: 'FAQ', href: '/faq' }
      ]}
      sections={[
        {
          title: 'Content and distribution',
          body: [
            'ACE Studio is structured to support content onboarding, producer attribution, account-based access control, and reporting across the catalogue.',
            'Producers, licensors, and distributors can use the platform both as a viewing surface and as an operational environment for titles managed inside the service.'
          ]
        },
        {
          title: 'Commercial and investor discussions',
          body: [
            'ACE Studio is also open to conversations with strategic partners and investors who require a clear view of the product, operating model, and growth direction.',
            'Initial enquiries should be sent to info@acestudio.ng with a short introduction and the nature of the proposed discussion.'
          ]
        },
        {
          title: 'How to start',
          body: [
            'A concise introduction, the organization involved, and the category of partnership being considered is enough to begin the conversation.',
            'The team can then route the discussion internally to the relevant commercial, operational, or platform stakeholder.'
          ]
        }
      ]}
    />
  );
}
