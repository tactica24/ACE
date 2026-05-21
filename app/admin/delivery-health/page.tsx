import { DashboardShell, SideNav } from '@/components/DashboardShell';
import DeliveryHealthPanel from '@/components/DeliveryHealthPanel';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DeliveryHealthPage() {
  await requireAdminUser('/admin/delivery-health');

  const videos = await prisma.video.findMany({
    where: {
      status: { in: ['HLS_UPLOADED', 'READY', 'PUBLISHED'] }
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      hlsUrl: true,
      hlsVersion: true,
      qualities: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return (
    <DashboardShell
      title="Delivery Health"
      description="Monitor HLS delivery status and validate playback readiness."
      sideNav={<SideNav active="/admin/delivery-health" items={getAdminNavItems()} />}
    >
      <DeliveryHealthPanel
        videos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          status: video.status,
          hlsUrl: video.hlsUrl,
          hlsVersion: video.hlsVersion,
          qualities: video.qualities,
          updatedAt: video.updatedAt.toISOString().slice(0, 10)
        }))}
      />
    </DashboardShell>
  );
}
