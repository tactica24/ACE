import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
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
          masterKey: true
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
          r2Key: true,
          fallbackR2Key: true,
          technicalMetadata: {
            select: {
              masterKey: true
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
        primaryReady: Boolean(video.r2Key),
        fallbackReady: Boolean(video.fallbackR2Key),
        masterReady: Boolean(video.technicalMetadata?.masterKey),
        episodeCount: video._count.episodes,
        readyEpisodeCount: video.episodes.filter(
          (episode) => ['APPROVED', 'PUBLISHED'].includes(episode.status) && Boolean(episode.r2Key || episode.fallbackR2Key || episode.technicalMetadata?.masterKey)
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
