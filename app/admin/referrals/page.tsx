import { DashboardShell, SideNav } from '@/components/DashboardShell';
import ReferralManager from '@/components/ReferralManager';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export default async function ReferralsPage() {
  const [promoters, videos] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, phone: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.video.findMany({ select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 200 })
  ]);

  return (
    <DashboardShell
      title="Referral Pipeline"
      description="Generate promoter links, track unlocks, and monitor top-up conversions."
      sideNav={
        <SideNav
          active="/admin/referrals"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/node', label: 'Node Monitor' },
            { href: '/admin/referrals', label: 'Referrals' },
            { href: '/admin/users', label: 'Users' }
          ]}
        />
      }
    >
      <ReferralManager promoters={promoters} videos={videos} grafanaUrl={env.ACE_GRAFANA_URL ?? null} />
    </DashboardShell>
  );
}

