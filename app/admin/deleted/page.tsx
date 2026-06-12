import { DashboardShell, SideNav } from '@/components/DashboardShell';
import ModerationQueue, { type ModerationQueueItem } from '@/components/ModerationQueue';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { prisma } from '@/lib/db';
import {
  getDeliveryFormatLabel,
  getSubtitlePackageStatus,
  getViewerPackageLabel,
  getViewerPackageStatus
} from '@/lib/delivery-package';
import { hasVideoMasterSource } from '@/lib/master-source';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';

export const dynamic = 'force-dynamic';

export default async function DeletedTitlesPage() {
  await requireAdminUser('/admin/deleted');

  const [videos, editCount] = await Promise.all([
    prisma.video.findMany({
      where: {
        seriesId: null,
        status: 'ARCHIVED'
      },
      orderBy: { updatedAt: 'desc' },
      take: 120,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        videoType: true,
        seriesId: true,
        ageRating: true,
        rightsTier: true,
        priceTier: true,
        unlockPrice: true,
        producerRevenueShare: true,
        platformRevenueShare: true,
        taxRevenueShare: true,
        releaseYear: true,
        originalLanguage: true,
        genres: true,
        contentWarnings: true,
        posterKey: true,
        series: {
          select: {
            posterKey: true
          }
        },
        primaryStorageKey: true,
        fallbackStorageKey: true,
        createdAt: true,
        creator: {
          select: {
            email: true,
            creator: {
              select: {
                displayName: true
              }
            }
          }
        },
        technicalMetadata: {
          select: {
            trailerKey: true,
            masterKey: true,
            masterSourceUrl: true,
            processingStatus: true,
            bunnyStreamVideoId: true,
            bunnyStreamReadyAt: true,
            bunnyStreamError: true,
            hlsManifestKey: true,
            hlsReadyAt: true,
            deliveryFormat: true,
            englishSubtitlesProvided: true,
            licensedTerritories: true,
            availabilityRegion: true
          }
        },
        _count: {
          select: {
            episodes: true,
            subtitleTracks: true
          }
        },
        subtitleTracks: {
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            label: true,
            languageCode: true,
            kind: true,
            fileKey: true,
            isDefault: true
          }
        },
        episodes: {
          select: {
            id: true,
            title: true,
            status: true,
            primaryStorageKey: true,
            fallbackStorageKey: true,
            technicalMetadata: {
              select: {
                masterKey: true,
                masterSourceUrl: true,
                hlsManifestKey: true,
                hlsReadyAt: true
              }
            }
          }
        }
      }
    }),
    prisma.video.count({
      where: {
        seriesId: null,
        status: {
          not: 'ARCHIVED'
        }
      }
    })
  ]);

  const deletedItems: ModerationQueueItem[] = videos.map((video) => {
    const readyEpisodeCount = video.episodes.filter(
      (episode) => episode.status === 'APPROVED' && hasReadyMoviePlayback(episode)
    ).length;

    return {
      id: `video-${video.id}`,
      hasModerationRecord: false,
      status: video.status,
      notes: null,
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        category: video.category,
        status: video.status,
        videoType: video.videoType,
        seriesId: video.seriesId,
        ageRating: video.ageRating,
        rightsTier: video.rightsTier,
        priceTier: video.priceTier,
        unlockPrice: video.unlockPrice,
        producerRevenueShare: video.producerRevenueShare,
        platformRevenueShare: video.platformRevenueShare,
        taxRevenueShare: video.taxRevenueShare,
        releaseYear: video.releaseYear,
        originalLanguage: video.originalLanguage,
        genres: video.genres,
        contentWarnings: video.contentWarnings,
        posterKey: video.posterKey ?? video.series?.posterKey ?? null,
        masterSourceUrl: video.technicalMetadata?.masterSourceUrl ?? null,
        processingStatus: video.technicalMetadata?.processingStatus ?? 'NO_MASTER',
        bunnyStreamVideoId: video.technicalMetadata?.bunnyStreamVideoId ?? null,
        bunnyStreamReadyAt: video.technicalMetadata?.bunnyStreamReadyAt?.toISOString() ?? null,
        bunnyStreamError: video.technicalMetadata?.bunnyStreamError ?? null,
        hlsManifestReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt),
        trailerDownloadHref: video.technicalMetadata?.trailerKey ? `/api/admin/videos/${video.id}/trailer` : null,
        posterDownloadHref: video.posterKey || video.series?.posterKey ? `/api/admin/videos/${video.id}/poster` : null,
        createdAt: video.createdAt.toISOString(),
        creatorName: video.creator.creator?.displayName ?? video.creator.email,
        subtitleTrackCount: video._count.subtitleTracks,
        subtitleTracks: video.subtitleTracks,
        englishSubtitlesProvided: video.technicalMetadata?.englishSubtitlesProvided ?? false,
        episodeCount: video._count.episodes,
        readyEpisodeCount,
        packageLabel: getViewerPackageLabel(video),
        packageStatus: getViewerPackageStatus({
          videoType: video.videoType,
          seriesId: video.seriesId,
          primaryReady: Boolean(video.primaryStorageKey),
          fallbackReady: Boolean(video.fallbackStorageKey),
          masterReady: hasVideoMasterSource(video),
          bunnyReady: Boolean(video.technicalMetadata?.bunnyStreamVideoId && video.technicalMetadata?.bunnyStreamReadyAt),
          bunnyFailed: Boolean(video.technicalMetadata?.bunnyStreamError || video.technicalMetadata?.processingStatus === 'TRANSCODE_FAILED'),
          bunnyProcessing: Boolean(
            video.technicalMetadata?.bunnyStreamVideoId &&
              !video.technicalMetadata?.bunnyStreamReadyAt &&
              video.technicalMetadata?.processingStatus !== 'TRANSCODE_FAILED'
          ),
          hlsReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt),
          episodeCount: video._count.episodes,
          readyEpisodeCount
        }),
        subtitleStatus: getSubtitlePackageStatus({
          subtitleTrackCount: video._count.subtitleTracks,
          englishSubtitlesProvided: video.technicalMetadata?.englishSubtitlesProvided ?? false
        }),
        deliveryFormat: getDeliveryFormatLabel({
          deliveryFormat: video.technicalMetadata?.deliveryFormat ?? null
        }),
        licensedTerritories: video.technicalMetadata?.licensedTerritories ?? [],
        availabilityRegion: video.technicalMetadata?.availabilityRegion ?? 'GLOBAL'
      }
    };
  });

  return (
    <DashboardShell
      title="Deleted titles"
      description="Archived titles leave the edit queue but stay recoverable here until you restore them."
      sideNav={
        <SideNav
          active="/admin/deleted"
          items={getAdminNavItems({ pendingModeration: editCount, deletedTitles: deletedItems.length })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="/admin/moderation">Back to edits</a>
          <a className="btn btn-ghost" href="/admin/upload">Create title</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Deleted titles</span>
          <strong>{deletedItems.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Still in edits</span>
          <strong>{editCount}</strong>
        </div>
      </div>
      <ModerationQueue initial={deletedItems} mode="deleted" />
    </DashboardShell>
  );
}
