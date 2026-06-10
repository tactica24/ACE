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
  if (normalized.includes('QUEUED')) return 'ENCODING_STARTED';
  if (normalized.includes('STARTED')) return 'ENCODING_STARTED';
  return normalized || 'NO_MASTER';
}

export default async function AdminVideosPage() {
  await requireAdminUser('/admin/videos');

  const missingPipelineConfig: string[] = [];
  if (!env.BUNNY_STREAM_LIBRARY_ID) missingPipelineConfig.push('BUNNY_STREAM_LIBRARY_ID');
  if (!env.BUNNY_STREAM_API_KEY) missingPipelineConfig.push('BUNNY_STREAM_API_KEY');
  if (!env.BUNNY_STREAM_READONLY_API_KEY) missingPipelineConfig.push('BUNNY_STREAM_READONLY_API_KEY');
  if (!env.BUNNY_STREAM_PULL_ZONE) missingPipelineConfig.push('BUNNY_STREAM_PULL_ZONE');
  if (!env.ACE_APP_BASE_URL) missingPipelineConfig.push('ACE_APP_BASE_URL');
  if (!env.BUNNY_STORAGE_API_KEY) missingPipelineConfig.push('BUNNY_STORAGE_API_KEY');
  if (!env.BUNNY_STORAGE_ZONE) missingPipelineConfig.push('BUNNY_STORAGE_ZONE');
  if (!env.BUNNY_STORAGE_ENDPOINT) missingPipelineConfig.push('BUNNY_STORAGE_ENDPOINT');

  const [pendingIntakeCount, moderationPendingCount, moderationApprovedCount, orphanApprovedCount, producers] =
    await Promise.all([
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
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
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
                      transcodeError: true,
                      hlsManifestKey: true,
                      hlsReadyAt: true,
                      masterDeletionEligible: true,
                      masterDeletedAt: true,
                      bunnyStreamLibraryId: true,
                      bunnyStreamVideoId: true,
                      bunnyStreamStatus: true,
                      bunnyStreamReadyAt: true,
                      bunnyStreamError: true,
                      trailerStreamLibraryId: true,
                      trailerStreamVideoId: true,
                      trailerStreamStatus: true,
                      trailerStreamReadyAt: true,
                      trailerStreamError: true
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

  const webhookBaseUrl = env.ACE_APP_BASE_URL?.replace(/\/+$/, '') || null;

  return (
    <DashboardShell
      title="Content delivery"
      description="Track Bunny Stream encoding, playback readiness, moderation, and publishing from one clean admin workflow."
      sideNav={<SideNav active="/admin/videos" items={getAdminNavItems()} />}
    >
      <AdminVideoProcessingPanel
        pipelineHealth={{
          bunnyReady: missingPipelineConfig.length === 0,
          libraryId: env.BUNNY_STREAM_LIBRARY_ID || null,
          pullZone: env.BUNNY_STREAM_PULL_ZONE || null,
          webhookUrl: webhookBaseUrl ? `${webhookBaseUrl}/api/webhooks/bunny-stream` : null,
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
            masterFileName: video.technicalMetadata?.masterFileName ?? null,
            masterFileSize: serializeFileSize(video.technicalMetadata?.masterFileSize),
            masterUploadedAt: video.technicalMetadata?.masterUploadedAt?.toISOString() ?? null,
            processingStatus: normalizeProcessingStatus(video.technicalMetadata?.processingStatus),
            playbackUrl: video.technicalMetadata?.playbackUrl ?? null,
            transcodeError: video.technicalMetadata?.transcodeError ?? null,
            hlsManifestKey: video.technicalMetadata?.hlsManifestKey ?? null,
            hlsReadyAt: video.technicalMetadata?.hlsReadyAt?.toISOString() ?? null,
            masterDeletionEligible: video.technicalMetadata?.masterDeletionEligible ?? false,
            masterDeletedAt: video.technicalMetadata?.masterDeletedAt?.toISOString() ?? null,
            bunnyStreamLibraryId: video.technicalMetadata?.bunnyStreamLibraryId ?? null,
            bunnyStreamVideoId: video.technicalMetadata?.bunnyStreamVideoId ?? null,
            bunnyStreamStatus: video.technicalMetadata?.bunnyStreamStatus ?? null,
            bunnyStreamReadyAt: video.technicalMetadata?.bunnyStreamReadyAt?.toISOString() ?? null,
            bunnyStreamError: video.technicalMetadata?.bunnyStreamError ?? null,
            trailerStreamLibraryId: video.technicalMetadata?.trailerStreamLibraryId ?? null,
            trailerStreamVideoId: video.technicalMetadata?.trailerStreamVideoId ?? null,
            trailerStreamStatus: video.technicalMetadata?.trailerStreamStatus ?? null,
            trailerStreamReadyAt: video.technicalMetadata?.trailerStreamReadyAt?.toISOString() ?? null,
            trailerStreamError: video.technicalMetadata?.trailerStreamError ?? null,
            qualities: video.qualities,
            trailerDownloadHref: video.technicalMetadata?.trailerKey ? `/api/admin/videos/${video.id}/trailer` : null,
            posterDownloadHref: video.posterKey ? `/api/admin/videos/${video.id}/poster` : null
          }))
        }))}
      />
    </DashboardShell>
  );
}
