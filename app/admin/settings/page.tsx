import { DashboardShell, SideNav } from '@/components/DashboardShell';
import AdminSettingsPanel from '@/components/AdminSettingsPanel';
import { requireAdminUser } from '@/lib/auth-page';
import { getFinanceConfig } from '@/lib/finance';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminUser('/admin/settings');
  const finance = await getFinanceConfig();
  const site = await getSiteSettings();

  return (
    <DashboardShell
      title="Admin controls"
      description="Change public launch mode, countdown messaging, and catalog pricing without editing code."
      sideNav={
        <SideNav
          active="/admin/settings"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/settings', label: 'Controls' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <AdminSettingsPanel
        initialFinance={{
          snackNaira: finance.snackNaira,
          standardNaira: finance.standardNaira,
          premiereNaira: finance.premiereNaira,
          snackUsdMinor: finance.snackUsdMinor,
          standardUsdMinor: finance.standardUsdMinor,
          premiereUsdMinor: finance.premiereUsdMinor,
          snackGbpMinor: finance.snackGbpMinor,
          standardGbpMinor: finance.standardGbpMinor,
          premiereGbpMinor: finance.premiereGbpMinor,
          snackCadMinor: finance.snackCadMinor,
          standardCadMinor: finance.standardCadMinor,
          premiereCadMinor: finance.premiereCadMinor,
          familyPassUsdMinor: finance.familyPassUsdMinor,
          familyPassGbpMinor: finance.familyPassGbpMinor,
          familyPassCadMinor: finance.familyPassCadMinor
        }}
        initialSite={{
          homePageMode: site.homePageMode,
          launchTitle: site.launchTitle,
          launchMessage: site.launchMessage,
          launchCountdownAt: site.launchCountdownAt ? site.launchCountdownAt.toISOString().slice(0, 16) : '',
          launchCtaLabel: site.launchCtaLabel ?? '',
          launchCtaHref: site.launchCtaHref ?? ''
        }}
      />
    </DashboardShell>
  );
}
