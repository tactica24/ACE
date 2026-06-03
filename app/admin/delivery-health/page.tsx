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
      status: { in: ['READY', 'PUBLISHED', 'APPROVED'] }
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          masterSourceUrl: true,
          hlsManifestKey: true,
          hlsReadyAt: true,
          playbackUrl: true
        }
      },
      createdAt: true,
      updatedAt: true
    }
  });

  return (
    <DashboardShell
      title="Delivery Health"
      description="Monitor master sources, Bunny HLS readiness, and playback validation."
      sideNav={<SideNav active="/admin/delivery-health" items={getAdminNavItems()} />}
    >
      <DeliveryHealthPanel
        videos={videos.map((video) => ({
          id: video.id,
          title: video.title,
          status: video.status,
          masterKey: video.technicalMetadata?.masterKey ?? null,
          masterSourceUrl: video.technicalMetadata?.masterSourceUrl ?? null,
          hlsManifestReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt),
          playbackUrl: video.technicalMetadata?.playbackUrl ?? null,
          updatedAt: video.updatedAt.toISOString().slice(0, 10)
        }))}
      />
    </DashboardShell>
  );
}
