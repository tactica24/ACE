import PublicInfoPage from '@/components/PublicInfoPage';

export default function HelpPage() {
  return (
    <PublicInfoPage
      eyebrow="Help Center"
      title="Simple guidance for access, playback, and getting around the platform."
      summary="This is the public help layer for the most common ACE Studio questions, especially around viewing access, account sign-in, and playback readiness."
      ctaLabel="Go to browse"
      ctaHref="/browse"
      sections={[
        {
          title: 'Account and access',
          body: [
            'If a title is unavailable, start by confirming that you are signed in with the correct account and that the account has the expected access.',
            'The platform is designed to keep account-linked access and playback connected, so the right account state should reflect across surfaces.'
          ]
        },
        {
          title: 'Playback support',
          body: [
            'For the best playback experience, use a stable connection and make sure your browser or device is fully updated.',
            'If playback still fails, the support route can help investigate blocked sessions, entitlement state, or device-specific issues.'
          ]
        }
      ]}
    />
  );
}
