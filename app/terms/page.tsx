import PublicInfoPage from '@/components/PublicInfoPage';

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms of Use"
      title="These terms describe the main rules that govern the use of ACE Studio."
      summary="By accessing or using ACE Studio, users agree to use the service lawfully, protect their account credentials, and respect the conditions attached to titles, access, and platform functionality."
      ctaLabel="Contact ACE Studio"
      ctaHref="mailto:info@acestudio.ng"
      secondaryLabel="Help centre"
      secondaryHref="/help"
      facts={[
        { label: 'Accounts', value: 'Users are responsible for their credentials' },
        { label: 'Content', value: 'Viewing is subject to authorized access' },
        { label: 'Questions', value: 'Support available via info@acestudio.ng' }
      ]}
      quickLinks={[
        { label: 'Help centre', href: '/help' },
        { label: 'Contact', href: '/contact' },
        { label: 'FAQ', href: '/faq' }
      ]}
      sections={[
        {
          title: 'Accounts and access',
          body: [
            'Users are responsible for the security of their account credentials and for activity that occurs through their account unless otherwise agreed with ACE Studio.',
            'Content availability depends on account access, platform rules, commercial terms, and the continued availability of the relevant title or package.'
          ]
        },
        {
          title: 'Content use',
          body: [
            'Platform content is provided for authorized viewing only. Users may not reproduce, redistribute, scrape, reverse engineer, or otherwise misuse content, access controls, or platform materials.',
            'ACE Studio may suspend or remove access where account misuse, payment issues, rights restrictions, or platform safety concerns arise.'
          ]
        },
        {
          title: 'Payments and support',
          body: [
            'Where payments apply, the commercial terms presented on the website form part of the access arrangement for the relevant account or title.',
            'Questions about access, billing, or account issues can be directed to info@acestudio.ng or the support channels provided inside the platform.'
          ]
        }
      ]}
    />
  );
}
