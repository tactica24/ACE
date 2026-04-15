import PublicInfoPage from '@/components/PublicInfoPage';

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About"
      title="ACE Studio presents films and series through a premium streaming product built for viewers, rights holders, and business partners."
      summary="The service combines discovery, account-based access, secure playback, producer operations, and reporting into one connected platform across web, mobile, and TV-linked viewing."
      ctaLabel="Browse titles"
      ctaHref="/browse"
      secondaryLabel="Frequently asked questions"
      secondaryHref="/faq"
      facts={[
        { label: 'Experience', value: 'Web, mobile, and TV-linked viewing' },
        { label: 'Model', value: 'Account-based access and secure playback' },
        { label: 'Operations', value: 'Producer, admin, and reporting workflows' }
      ]}
      quickLinks={[
        { label: 'Browse catalog', href: '/browse' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Partnership enquiries', href: '/partners' }
      ]}
      sections={[
        {
          title: 'Platform overview',
          body: [
            'ACE Studio is structured as a streaming service for film and series discovery, playback, and catalog management. Viewers can discover titles, sign in with one account, and continue watching across supported devices.',
            'Behind the viewing experience, the platform supports title operations, producer attribution, access control, and internal reporting needed to run a professional content service.'
          ]
        },
        {
          title: 'Who the platform serves',
          body: [
            'ACE Studio serves viewers seeking a refined streaming experience, producers managing releases and records, and business stakeholders evaluating the platform for licensing, distribution, or strategic collaboration.',
            'The product is designed to feel credible for partners and operational teams without losing the ease and polish expected by everyday viewers.'
          ]
        },
        {
          title: 'Product direction',
          body: [
            'The goal is a world-class streaming environment with strong discovery, clear account access, and dependable operational controls rather than a simple media catalogue.',
            'That means every part of the experience, from playback to support pages, is being shaped to reflect a premium media product and a serious business platform.'
          ]
        }
      ]}
    />
  );
}
