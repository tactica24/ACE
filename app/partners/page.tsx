import PublicInfoPage from '@/components/PublicInfoPage';

export default function PartnersPage() {
  return (
    <PublicInfoPage
      eyebrow="Licensing & Partners"
      title="A cleaner partnership surface for producers, licensors, and growth collaborators."
      summary="ACE Studio is being shaped to support title onboarding, reporting, catalog positioning, and business-ready presentation without sacrificing viewer simplicity."
      ctaLabel="Talk to the studio team"
      ctaHref="/studio/contact"
      sections={[
        {
          title: 'Licensing workflow',
          body: [
            'ACE Studio supports metadata management, producer attribution, reporting surfaces, and controlled title activation so business partners can work from cleaner records.',
            'That makes it easier to prepare statements, review title status, and keep rights-sensitive workflows documented.'
          ]
        },
        {
          title: 'Platform collaboration',
          body: [
            'The partnership path is intended for studios, distributors, brands, and strategic collaborators who need a serious streaming presentation layer.',
            'As the platform matures, this route will also support more formalized launch, catalog, and reporting collaboration.'
          ]
        }
      ]}
    />
  );
}
