import { DashboardShell, SideNav } from '@/components/DashboardShell';
import ReferralManager from '@/components/ReferralManager';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function ReferralsPage() {
  await requireAdminUser('/admin/referrals');

  let promoters: Array<{ id: string; email: string }> = [];
  let videos: Array<{ id: string; title: string }> = [];
  try {
    [promoters, videos] = await Promise.all([
      prisma.user.findMany({ select: { id: true, email: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
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
          items={getAdminNavItems()}
        />
      }
    >
      <ReferralManager promoters={promoters} videos={videos} grafanaUrl={env.ACE_GRAFANA_URL ?? null} />
    </DashboardShell>
  );
}
