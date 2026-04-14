import PublicInfoPage from '@/components/PublicInfoPage';

export default function PartnersPage() {
  return (
    <PublicInfoPage
      eyebrow="Partnerships"
      title="ACE Studio welcomes partnership discussions with content owners, distributors, brands, and investors."
      summary="Partnership discussions can cover catalog licensing, platform distribution, commercial collaboration, and broader strategic opportunities. Contact info@acestudio.ng to begin a conversation."
      ctaLabel="Email partnerships"
      ctaHref="mailto:info@acestudio.ng"
      sections={[
        {
          title: 'Content and distribution',
          body: [
            'ACE Studio is structured to support content onboarding, title attribution, access control, and reporting across the catalog.',
            'Producers, licensors, and distributors can use the platform as a distribution surface and as an operational record for titles managed within the service.'
          ]
        },
        {
          title: 'Commercial and investor discussions',
          body: [
            'ACE Studio is also open to conversations with strategic partners and investors who require a clear view of the product, operating model, and growth direction.',
            'Initial enquiries should be sent to info@acestudio.ng with a short introduction and the nature of the proposed discussion.'
          ]
        }
      ]}
    />
  );
}
