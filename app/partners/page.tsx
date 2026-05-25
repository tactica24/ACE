import PublicInfoPage from '@/components/PublicInfoPage';

export default function PartnersPage() {
  return (
    <PublicInfoPage
      eyebrow="Partnerships"
      title="Partnerships with ACE Studio."
      summary="ACE Studio welcomes focused conversations with content owners, distributors, brands, and strategic partners across licensing, distribution, commercial collaboration, and platform growth."
      ctaLabel="Email partnership enquiries"
      ctaHref="mailto:info@acestudio.ng"
      secondaryLabel="About ACE Studio"
      secondaryHref="/about"
      quickLinks={[
        { label: 'Contact', href: '/contact' },
        { label: 'About ACE Studio', href: '/about' },
        { label: 'FAQ', href: '/faq' }
      ]}
      facts={[
        { label: 'Content', value: 'Licensing and distribution' },
        { label: 'Commercial', value: 'Brand and growth partnerships' },
        { label: 'Contact', value: 'info@acestudio.ng' }
      ]}
      sections={[
        {
          title: 'Content and distribution',
          body: [
            'ACE Studio is open to conversations with producers, rights holders, distributors, and catalog owners with films or series suited to the platform.',
            'Initial enquiries should include the company or rights holder name, the type of content involved, and the preferred next step.'
          ]
        },
        {
          title: 'Commercial collaboration',
          body: [
            'Brand, media, and strategic partnerships can be discussed where there is a clear audience, content, or market opportunity.',
            'The strongest enquiries are specific about the proposed collaboration and the value it should create for viewers, partners, and ACE Studio.'
          ]
        }
      ]}
    />
  );
}
