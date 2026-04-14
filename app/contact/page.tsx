import PublicInfoPage from '@/components/PublicInfoPage';

export default function ContactPage() {
  return (
    <PublicInfoPage
      eyebrow="Contact"
      title="Speak with ACE Studio about support, partnerships, or platform access."
      summary="Use this page as the public contact point for operational questions, content partnerships, and viewer support follow-up."
      ctaLabel="Open support"
      ctaHref="/account/contact"
      sections={[
        {
          title: 'Viewer support',
          body: [
            'If you need help with account access, playback availability, or catalog discovery, the ACE Studio support desk is the fastest route.',
            'Support requests can be tracked through the same operating system used by the admin team so issues are easier to follow through cleanly.'
          ]
        },
        {
          title: 'Partnership and business enquiries',
          body: [
            'For licensing, investor conversations, platform partnerships, and producer onboarding discussions, ACE Studio can route your request internally through the partner contact desk.',
            'This keeps business conversations separate from day-to-day viewer support while preserving a documented record.'
          ]
        }
      ]}
    />
  );
}
