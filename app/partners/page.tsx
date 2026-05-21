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
      quickLinks={[
        { label: 'Contact', href: '/contact' },
        { label: 'About ACE Studio', href: '/about' },
        { label: 'FAQ', href: '/faq' }
      ]}
    />
  );
}
