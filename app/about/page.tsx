import PublicInfoPage from '@/components/PublicInfoPage';

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About"
      title="A professional streaming platform for films, series, and connected viewing."
      summary="ACE Studio brings discovery, account access, secure playback, producer operations, and reporting into one focused entertainment product for viewers and partners."
      ctaLabel="Browse titles"
      ctaHref="/browse"
      secondaryLabel="Frequently asked questions"
      secondaryHref="/faq"
      facts={[
        { label: 'Viewing', value: 'Web, mobile, and TV-linked screens' },
        { label: 'Access', value: 'Account-based unlocks and playback' },
        { label: 'Operations', value: 'Producer, admin, and reports' }
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
            'ACE Studio is built for film and series discovery, secure playback, and catalog management. Viewers can find titles, sign in with one account, unlock access, and continue watching across supported devices.',
            'Behind the viewer experience, the platform supports title operations, producer attribution, access control, and reporting for a serious content business.'
          ]
        },
        {
          title: 'Who the platform serves',
          body: [
            'ACE Studio serves viewers who want a polished streaming experience, producers managing releases and records, and partners evaluating licensing, distribution, or strategic collaboration.',
            'The product is designed to feel credible to business teams while remaining simple and elegant for everyday viewers.'
          ]
        },
        {
          title: 'Product direction',
          body: [
            'The goal is a world-class streaming environment with strong discovery, clear access, and dependable operations.',
            'Every part of the experience, from playback to support, is being shaped to reflect a premium media product and a trustworthy business platform.'
          ]
        }
      ]}
    />
  );
}
