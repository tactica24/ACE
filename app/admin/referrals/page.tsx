import { DashboardShell, SideNav } from '@/components/DashboardShell';
import ReferralManager from '@/components/ReferralManager';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function ReferralsPage() {
  await requireAdminUser('/admin/referrals');

  let promoters: Array<{ id: string; email: string; phone: string }> = [];
  let videos: Array<{ id: string; title: string }> = [];
  try {
    [promoters, videos] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true, phone: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.video.findMany({ select: { id: true, title: true }, orderBy: { createdAt: 'desc' }, take: 200 })
    ]);
  } catch {
    promoters = [];
    videos = [];
  }

  return (
    <DashboardShell
      title="Referral pipeline"
      description="Create promoter links, track unlocks, and monitor top-up conversions."
      sideNav={
        <SideNav
          active="/admin/referrals"
          items={[
            { href: '/admin', label: 'Overview' },
            { href: '/admin/intake', label: 'Creator intake' },
            { href: '/admin/finance', label: 'Finance' },
            { href: '/admin/moderation', label: 'Moderation' },
            { href: '/admin/support', label: 'Support' },
            { href: '/admin/node', label: 'Infrastructure' },
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
