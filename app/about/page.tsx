import PublicInfoPage from '@/components/PublicInfoPage';

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About"
      title="ACE Studio is a streaming platform for film and series distribution across web, mobile, and connected TV."
      summary="The platform combines catalog discovery, account-based access, secure playback, producer operations, and reporting tools in one connected product."
      ctaLabel="Browse titles"
      ctaHref="/browse"
      sections={[
        {
          title: 'Platform scope',
          body: [
            'ACE Studio is built to support the commercial presentation and delivery of films and series to viewers across multiple devices, including web, mobile, and TV-linked viewing.',
            'The service is designed to present licensed content clearly, manage access at account level, and maintain a structured operating environment for catalog and reporting.'
          ]
        },
        {
          title: 'Who the platform serves',
          body: [
            'ACE Studio serves viewers looking for quality film and series access, producers managing releases and records, and business stakeholders who require a credible operating platform.',
            'This includes content partners, licensors, and prospective investors evaluating product readiness, reporting quality, and operational maturity.'
          ]
        }
      ]}
    />
  );
}
