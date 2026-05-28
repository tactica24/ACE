import { prisma } from '@/lib/db';

function serializeFileSize(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
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
          masterFileName: true,
          masterFileSize: true,
          masterUploadedAt: true,
          processingStatus: true,
          playbackUrl: true,
          trailerKey: true
        }
      }
    }
  });

  if (!video) return null;

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
    masterFileName: video.technicalMetadata?.masterFileName ?? null,
    masterFileSize: serializeFileSize(video.technicalMetadata?.masterFileSize),
    masterUploadedAt: video.technicalMetadata?.masterUploadedAt?.toISOString() ?? null,
    processingStatus: video.technicalMetadata?.processingStatus ?? 'NO_MASTER',
    playbackUrl: video.technicalMetadata?.playbackUrl ?? null,
    qualities: video.qualities,
    trailerDownloadHref: video.technicalMetadata?.trailerKey ? `/api/admin/videos/${video.id}/trailer` : null,
    posterDownloadHref: video.posterKey || video.series?.posterKey ? `/api/admin/videos/${video.id}/poster` : null
  };
}
