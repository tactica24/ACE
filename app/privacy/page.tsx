import PublicInfoPage from '@/components/PublicInfoPage';

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy"
      title="A clear privacy surface for account, playback, and support data."
      summary="ACE Studio uses account, playback, and operational data to deliver streaming access, improve reliability, and support the business workflows behind the platform."
      ctaLabel="View help center"
      ctaHref="/help"
      sections={[
        {
          title: 'What data is used',
          body: [
            'Platform data may include account identity, session state, playback activity, and support or operational records needed to keep the service working.',
            'Some of this data also supports reporting, entitlement checks, fraud prevention, and administrative troubleshooting.'
          ]
        },
        {
          title: 'How it is used',
          body: [
            'Data is used to authenticate users, protect playback, document support actions, and maintain an accurate operating history across the platform.',
            'As the legal framework is finalized, this page can evolve into a fuller production privacy notice without changing the public route structure.'
          ]
        }
      ]}
    />
  );
}
