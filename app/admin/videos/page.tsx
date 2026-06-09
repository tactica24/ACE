import AdminVideoProcessingPanel from '@/components/AdminVideoProcessingPanel';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

function serializeFileSize(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

function normalizeProcessingStatus(value: string | null | undefined) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'AKASH_QUEUED') return 'CONTABO_QUEUED';
  if (normalized === 'AKASH_STARTED') return 'ENCODING_STARTED';
  return normalized || 'NO_MASTER';
}

export default async function AdminVideosPage() {
  await requireAdminUser('/admin/videos');

  const missingPipelineConfig: string[] = [];
  if (!env.CONTABO_TRANSCODE_API_URL) missingPipelineConfig.push('CONTABO_TRANSCODE_API_URL');
  if (!env.CONTABO_PIPELINE_SECRET) missingPipelineConfig.push('CONTABO_PIPELINE_SECRET');
  if (!env.ACE_APP_BASE_URL) missingPipelineConfig.push('ACE_APP_BASE_URL');
  if (!env.BUNNY_STORAGE_API_KEY) missingPipelineConfig.push('BUNNY_STORAGE_API_KEY');
  if (!env.BUNNY_STORAGE_ZONE) missingPipelineConfig.push('BUNNY_STORAGE_ZONE');
  if (!env.BUNNY_STORAGE_ENDPOINT) missingPipelineConfig.push('BUNNY_STORAGE_ENDPOINT');

  const [pendingIntakeCount, moderationPendingCount, moderationApprovedCount, orphanApprovedCount, producers] = await Promise.all([
    prisma.user.count({
      where: {
        signupIntent: 'CREATOR',
        creatorAccessStatus: 'SUBMITTED',
        role: 'USER'
      }
    }),
    prisma.moderationItem.count({
      where: { status: 'PENDING' }
    }),
    prisma.moderationItem.count({
      where: { status: 'APPROVED' }
    }),
    prisma.video.count({
      where: {
        status: 'APPROVED',
        moderation: { is: null }
      }
    }),
    prisma.creatorProfile.findMany({
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
                    masterSourceUrl: true,
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
    })
  ]);

  return (
    <DashboardShell
      title="Content pipeline"
      description="Move titles from intake, moderation and master attachment into Contabo HLS processing and live playback validation."
      sideNav={<SideNav active="/admin/videos" items={getAdminNavItems()} />}
    >
      <AdminVideoProcessingPanel
        pipelineHealth={{
          contaboReady: missingPipelineConfig.length === 0,
          contaboApiUrl: env.CONTABO_TRANSCODE_API_URL || null,
          callbackBaseUrl: env.ACE_APP_BASE_URL || null,
          missingConfig: missingPipelineConfig
        }}
        initialPendingIntakeCount={pendingIntakeCount}
        initialModerationCounts={{
          pending: moderationPendingCount,
          approved: moderationApprovedCount,
          orphanApproved: orphanApprovedCount
        }}
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
            masterSourceUrl: video.technicalMetadata?.masterSourceUrl ?? null,
            masterFileName: video.technicalMetadata?.masterFileName ?? null,
            masterFileSize: serializeFileSize(video.technicalMetadata?.masterFileSize),
            masterUploadedAt: video.technicalMetadata?.masterUploadedAt?.toISOString() ?? null,
            processingStatus: normalizeProcessingStatus(video.technicalMetadata?.processingStatus),
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
