import PublicInfoPage from '@/components/PublicInfoPage';

export default function PrivacyPage() {
  return (
    <PublicInfoPage
      eyebrow="Privacy Notice"
      title="This notice explains the main categories of information used to operate ACE Studio."
      summary="ACE Studio uses account, playback, transaction, and support information to provide access to the service, operate the platform, and respond to legitimate business, compliance, and support needs."
      ctaLabel="Contact privacy support"
      ctaHref="mailto:info@acestudio.ng"
      secondaryLabel="Terms of use"
      secondaryHref="/terms"
      facts={[
        { label: 'Records', value: 'Account, access, and support activity' },
        { label: 'Purpose', value: 'Service delivery, security, and operations' },
        { label: 'Questions', value: 'Directed to info@acestudio.ng' }
      ]}
      quickLinks={[
        { label: 'Terms of use', href: '/terms' },
        { label: 'Contact', href: '/contact' },
        { label: 'Help centre', href: '/help' }
      ]}
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
          title: 'Mobile auth, downloads, and checkout boundaries',
          body: [
            'Mobile sign-in is handled through Firebase authentication and account session records required to keep users signed in across supported devices.',
            'Offline playback packages are encrypted and managed with retention cleanup policies so obsolete package files and records do not persist indefinitely.',
            'Digital purchase checkout flows are handled through approved payment channels outside restricted in-app purchase surfaces when required by platform policy.'
          ]
        },
        {
          title: 'Questions',
          body: [
            'Questions about privacy, stored data, or account-related records can be directed to info@acestudio.ng.',
            "This notice may be updated as the platform's legal and operational documentation continues to mature."
          ]
        }
      ]}
    />
  );
}
