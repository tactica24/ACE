import PublicInfoPage from '@/components/PublicInfoPage';

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy Notice"
      title="This notice explains the main categories of data used to operate ACE Studio."
      summary="ACE Studio uses account, playback, transaction, and support information to provide access to the service, operate the platform, and respond to legitimate business and support needs."
      ctaLabel="Contact privacy support"
      ctaHref="mailto:info@acestudio.ng"
      sections={[
        {
          title: 'Data collected',
          body: [
            'The platform may collect account details, session information, playback activity, purchase or access records, support messages, and device or browser information needed to deliver the service.',
            'Additional information may be stored where required for producer onboarding, reporting, financial records, or platform administration.'
          ]
        },
        {
          title: 'Purpose of use',
          body: [
            'Data is used to authenticate users, control content access, support playback security, document support activity, manage reporting, and operate internal administration.',
            'Where legally or operationally necessary, ACE Studio may also retain records needed for auditing, compliance, fraud prevention, dispute handling, or financial reconciliation.'
          ]
        },
        {
          title: 'Questions',
          body: [
            'Questions about privacy, stored data, or account-related records can be directed to info@acestudio.ng.',
            'This notice may be updated as the platform’s legal and operational documentation continues to mature.'
          ]
        }
      ]}
    />
  );
}
