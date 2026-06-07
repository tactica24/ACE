import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasReadyMoviePlayback } from '@/lib/movie-assets';
import { hasVideoMasterSource } from '@/lib/master-source';
import {
  getDeliveryFormatLabel,
  getSubtitlePackageStatus,
  getViewerPackageLabel,
  getViewerPackageStatus
} from '@/lib/delivery-package';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const videos = await prisma.video.findMany({
    where: { creatorId: auth.sub },
    orderBy: { createdAt: 'desc' },
    include: {
      technicalMetadata: {
        select: {
          deliveryFormat: true,
          englishSubtitlesProvided: true,
          masterKey: true,
          masterSourceUrl: true,
          hlsManifestKey: true,
          hlsReadyAt: true
        }
      },
      _count: {
        select: {
          subtitleTracks: true,
          episodes: true
        }
      },
      episodes: {
        select: {
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
  });

  return NextResponse.json({
    videos: videos.map((video) => ({
      ...video,
      packageLabel: getViewerPackageLabel(video),
      packageStatus: getViewerPackageStatus({
        videoType: video.videoType,
        seriesId: video.seriesId,
        primaryReady: Boolean(video.primaryStorageKey),
        fallbackReady: Boolean(video.fallbackStorageKey),
        masterReady: hasVideoMasterSource(video),
        hlsReady: Boolean(video.technicalMetadata?.hlsManifestKey && video.technicalMetadata?.hlsReadyAt),
        episodeCount: video._count.episodes,
        readyEpisodeCount: video.episodes.filter(
          (episode) => hasReadyMoviePlayback(episode)
        ).length
      }),
      subtitleStatus: getSubtitlePackageStatus({
        subtitleTrackCount: video._count.subtitleTracks,
        englishSubtitlesProvided: video.technicalMetadata?.englishSubtitlesProvided ?? false
      }),
      deliveryFormatLabel: getDeliveryFormatLabel({
        deliveryFormat: video.technicalMetadata?.deliveryFormat ?? null
      })
    }))
  });
}
