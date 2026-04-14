import PublicInfoPage from '@/components/PublicInfoPage';

export default function AboutPage() {
  return (
    <PublicInfoPage
      eyebrow="About ACE Studio"
      title="A cinematic streaming platform built for African stories and global audiences."
      summary="ACE Studio combines premium discovery, secure playback, and investor-ready presentation for films and series that deserve a stronger digital home."
      sections={[
        {
          title: 'What we are building',
          body: [
            'ACE Studio is designed to present films, series, and premium video content with the polish of a world-class streaming platform while staying rooted in African storytelling strength.',
            'The product combines premium visual presentation, account-linked access, and clean administrative tooling for catalog, reporting, and rights management.'
          ]
        },
        {
          title: 'Why it matters',
          body: [
            'The platform is built to help viewers discover better stories, while also helping producers, licensors, and partners work with cleaner records and stronger presentation.',
            'That means the experience needs to feel immersive for viewers and credible for operators, investors, and business partners.'
          ]
        }
      ]}
    />
  );
}
