import PublicInfoPage from '@/components/PublicInfoPage';

export default function TermsPage() {
  return (
    <PublicInfoPage
      eyebrow="Terms of Use"
      title="Terms for using ACE Studio."
      summary="These terms explain the basic rules for account use, authorized viewing, payments where applicable, and responsible use of the platform."
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
            'Users are responsible for keeping account credentials secure and for activity that occurs through their account unless ACE Studio agrees otherwise.',
            'Content availability depends on account access, platform rules, commercial terms, rights restrictions, and the continued availability of the relevant title or package.'
          ]
        },
        {
          title: 'Content use',
          body: [
            'Platform content is provided for authorized viewing only. Users may not reproduce, redistribute, scrape, reverse engineer, or misuse content, access controls, or platform materials.',
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
