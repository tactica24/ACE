import AdminVideoProcessingPanel from '@/components/AdminVideoProcessingPanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function serializeFileSize(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export default async function AdminVideosPage() {
  await requireAdminUser('/admin/videos');

  const producers = await prisma.creatorProfile.findMany({
    where: {
      creatorNumber: {
        not: null
      }
    },
    orderBy: [
      { displayName: 'asc' },
      { id: 'asc' }
    ],
    select: {
      id: true,
      userId: true,
      creatorNumber: true,
      displayName: true,
      user: {
        select: {
          email: true,
          videos: {
            where: {
              seriesId: null
            },
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              posterKey: true,
              creatorId: true,
              technicalMetadata: {
                select: {
                  masterKey: true,
                  masterFileName: true,
                  masterFileSize: true,
                  masterUploadedAt: true,
                  processingStatus: true,
                  playbackUrl: true,
                  trailerKey: true,
                  orchestrationProvider: true,
                  orchestrationJobId: true,
                  transcodeProvider: true,
                  transcodeTaskId: true,
                  transcodeError: true,
                  hlsOutputPath: true,
                  hlsManifestKey: true,
                  hlsReadyAt: true,
                  masterDeletionEligible: true,
                  masterDeletedAt: true
                }
              },
              qualities: true
            }
          }
        }
      }
    }
  });

  return (
    <DashboardShell
      title="Admin videos"
      description="Operate MP4 masters, playback validation, cleanup, and publish gating from one desk."
      sideNav={<SideNav active="/admin/videos" items={getAdminNavItems()} />}
    >
      <AdminVideoProcessingPanel
        initialProducers={producers.map((producer) => ({
          id: producer.userId,
          profileId: producer.id,
          name: producer.displayName,
          email: producer.user.email,
          creatorNumber: producer.creatorNumber!,
          videos: producer.user.videos.map((video) => ({
            id: video.id,
            title: video.title,
            status: video.status,
            createdAt: video.createdAt.toISOString(),
            updatedAt: video.updatedAt.toISOString(),
            creatorId: video.creatorId,
            creatorName: producer.displayName,
            creatorEmail: producer.user.email,
            masterKey: video.technicalMetadata?.masterKey ?? null,
            masterFileName: video.technicalMetadata?.masterFileName ?? null,
            masterFileSize: serializeFileSize(video.technicalMetadata?.masterFileSize),
            masterUploadedAt: video.technicalMetadata?.masterUploadedAt?.toISOString() ?? null,
            processingStatus: video.technicalMetadata?.processingStatus ?? 'NO_MASTER',
            playbackUrl: video.technicalMetadata?.playbackUrl ?? null,
            orchestrationProvider: video.technicalMetadata?.orchestrationProvider ?? null,
            orchestrationJobId: video.technicalMetadata?.orchestrationJobId ?? null,
            transcodeProvider: video.technicalMetadata?.transcodeProvider ?? null,
            transcodeTaskId: video.technicalMetadata?.transcodeTaskId ?? null,
            transcodeError: video.technicalMetadata?.transcodeError ?? null,
            hlsOutputPath: video.technicalMetadata?.hlsOutputPath ?? null,
            hlsManifestKey: video.technicalMetadata?.hlsManifestKey ?? null,
            hlsReadyAt: video.technicalMetadata?.hlsReadyAt?.toISOString() ?? null,
            masterDeletionEligible: video.technicalMetadata?.masterDeletionEligible ?? false,
            masterDeletedAt: video.technicalMetadata?.masterDeletedAt?.toISOString() ?? null,
            qualities: video.qualities,
            trailerDownloadHref: video.technicalMetadata?.trailerKey ? `/api/admin/videos/${video.id}/trailer` : null,
            posterDownloadHref: video.posterKey ? `/api/admin/videos/${video.id}/poster` : null
          }))
        }))}
      />
    </DashboardShell>
  );
}
