import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { prisma } from '@/lib/db';
import ModerationQueue, { type ModerationQueueItem } from '@/components/ModerationQueue';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import {
  getDeliveryFormatLabel,
  getSubtitlePackageStatus,
  getViewerPackageLabel,
  getViewerPackageStatus
} from '@/lib/delivery-package';
import { hasVideoMasterSource } from '@/lib/master-source';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';

export const dynamic = 'force-dynamic';

export default async function ModerationPage() {
  await requireAdminUser('/admin/moderation');

  let queueItems: ModerationQueueItem[] = [];
  try {
    const [items, orphanApprovedVideos] = await Promise.all([
      prisma.moderationItem.findMany({
        where: { status: { in: ['PENDING', 'APPROVED'] } },
        include: {
          video: {
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
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.video.findMany({
        where: {
          status: 'APPROVED',
          moderation: { is: null }
        },
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
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ]);

    const mapQueueVideo = (video: (typeof items)[number]['video'] | (typeof orphanApprovedVideos)[number]) => {
      const readyEpisodeCount = video.episodes.filter(
        (episode) => episode.status === 'APPROVED' && hasReadyMoviePlayback(episode)
      ).length;

      return {
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
        trailerDownloadHref: video.technicalMetadata?.trailerKey
          ? `/api/admin/videos/${video.id}/trailer`
          : null,
        posterDownloadHref: video.posterKey || video.series?.posterKey ? `/api/admin/videos/${video.id}/poster` : null,
        createdAt: video.createdAt.toISOString(),
        creatorName: video.creator.creator?.displayName ?? video.creator.email,
        subtitleTrackCount: video._count.subtitleTracks,
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
      };
    };

     queueItems = [
       ...items.map((item) => ({
         id: item.id,
         hasModerationRecord: true,
         status: item.status,
         notes: item.notes,
         video: mapQueueVideo(item.video)
       })),
       ...orphanApprovedVideos.map((video) => ({
         id: `video-${video.id}`,
         hasModerationRecord: false,
         status: 'APPROVED',
         notes: 'Approved title without a moderation record. Remove it from the catalog here if it should not remain live.',
         video: mapQueueVideo(video)
       }))
     ];

   } catch {
     queueItems = [];
   }

  return (
    <DashboardShell
      title="Moderation queue"
      description="Review titles with poster, pricing and territory metadata before approving them for release."
      sideNav={
        <SideNav
          active="/admin/moderation"
          items={getAdminNavItems({ pendingModeration: queueItems.length })}
        />
      }
      actions={
        <div className="action-list">
          <a className="btn btn-primary" href="#moderation-queue">Review titles</a>
          <a className="btn btn-ghost" href="/admin/settings">Pricing controls</a>
          <a className="btn btn-ghost" href="/admin/users">Producer accounts</a>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="detail-card">
          <span className="detail-label">Queue size</span>
          <strong>{queueItems.length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Pending review</span>
          <strong>{queueItems.filter((item) => item.status === 'PENDING').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Already approved</span>
          <strong>{queueItems.filter((item) => item.status === 'APPROVED').length}</strong>
        </div>
        <div className="detail-card">
          <span className="detail-label">Orphan approved titles</span>
          <strong>{queueItems.filter((item) => !item.hasModerationRecord).length}</strong>
        </div>
      </div>
      <div id="moderation-queue">
        <ModerationQueue initial={queueItems} />
      </div>
    </DashboardShell>
  );
}
