import PublicInfoPage from '@/components/PublicInfoPage';

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms of Use"
      title="Platform use, content access, and account expectations."
      summary="This page acts as the public terms placeholder for ACE Studio while the legal and commercial framework continues to be finalized."
      ctaLabel="Browse platform"
      ctaHref="/browse"
      sections={[
        {
          title: 'Use of the platform',
          body: [
            'ACE Studio is provided for lawful personal viewing and approved business use connected to the platform.',
            'Users are expected to respect account security, content restrictions, and all access limits attached to titles or packages.'
          ]
        },
        {
          title: 'Content and access',
          body: [
            'Availability of titles may change based on rights, releases, territory, or operational decisions.',
            'Specific commercial terms, billing conditions, and rights details should be read alongside the account and access information presented on the website.'
          ]
        }
      ]}
    />
  );
}
