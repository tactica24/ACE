import { prisma } from '@/lib/db';
import { getMovieUploadFolderPrefixFromKey } from '@/lib/upload-security';

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

export async function getProcessingVideo(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      posterKey: true,
      series: {
        select: {
          posterKey: true
        }
      },
      creatorId: true,
      qualities: true,
      creator: {
        select: {
          email: true,
          creator: {
            select: { displayName: true }
          }
        }
      },
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
      }
    }
  });

  if (!video) return null;

  const bunnyFolderPrefix =
    getMovieUploadFolderPrefixFromKey(video.technicalMetadata?.masterKey) ??
    getMovieUploadFolderPrefixFromKey(video.posterKey) ??
    getMovieUploadFolderPrefixFromKey(video.technicalMetadata?.trailerKey) ??
    null;

  return {
    id: video.id,
    title: video.title,
    status: video.status,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    creatorId: video.creatorId,
    creatorName: video.creator.creator?.displayName ?? video.creator.email,
    creatorEmail: video.creator.email,
    masterKey: video.technicalMetadata?.masterKey ?? null,
    masterSourceUrl: video.technicalMetadata?.masterSourceUrl ?? null,
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
    bunnyFolderPrefix,
    qualities: video.qualities,
    trailerDownloadHref: video.technicalMetadata?.trailerKey ? `/api/admin/videos/${video.id}/trailer` : null,
    posterDownloadHref: video.posterKey || video.series?.posterKey ? `/api/admin/videos/${video.id}/poster` : null
  };
}
