import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMobileViewerAccessState } from '@/lib/mobile-viewer-access';
import { getViewerReadyEpisodeWhere, getViewerReadyVideoWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const title = await prisma.video.findFirst({
    where: getViewerReadyVideoWhere(params.id),
    include: {
      technicalMetadata: {
        select: {
          trailerKey: true,
          vendorId: true,
          studioReleaseTitle: true,
          countriesOfOrigin: true,
          licensedTerritories: true,
          copyrightLine: true,
          castCredits: true,
          crewCredits: true
        }
      },
      subtitleTracks: {
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
      },
      episodes: {
        where: getViewerReadyEpisodeWhere(),
        orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
        include: {
          technicalMetadata: {
            select: {
              trailerKey: true
            }
          },
          subtitleTracks: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }]
          }
        }
      }
    }
  });

  if (!title) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  const access = await getMobileViewerAccessState(auth, { id: title.id, creatorId: title.creatorId });
  const episodeIds = title.episodes.map((episode) => episode.id);
  const ownerHasUniversalAccess = Boolean(auth && (auth.role === 'ADMIN' || auth.sub === title.creatorId));
  const relevantVideoIds = [title.id, ...episodeIds];
  const [unlockedEpisodeIds, historyByVideoId] = await Promise.all([
    ownerHasUniversalAccess || !auth || episodeIds.length === 0
      ? Promise.resolve(new Set<string>())
      : prisma.unlock
          .findMany({
            where: {
              userId: auth.sub,
              videoId: { in: episodeIds }
            },
            select: { videoId: true }
          })
          .then((rows) => new Set(rows.map((unlock) => unlock.videoId))),
    !auth
      ? Promise.resolve(new Map<string, number>())
      : prisma.watchHistory
          .findMany({
            where: {
              userId: auth.sub,
              videoId: { in: relevantVideoIds }
            },
            select: {
              videoId: true,
              progressSec: true
            }
          })
          .then(
            (rows) =>
              new Map<string, number>(
                rows.map((item) => [item.videoId, item.progressSec])
              )
          )
  ]);

  const mapSubtitleTrack = (track: {
    id: string;
    label: string;
    languageCode: string;
    kind: string;
    fileKey: string;
    isDefault: boolean;
  }) => ({
    id: track.id,
    label: track.label,
    languageCode: track.languageCode,
    kind: track.kind,
    fileKey: track.fileKey,
    fileUrl: `/api/media/${track.fileKey}`,
    isDefault: track.isDefault
  });

  const mapEpisodeAccess = (episodeId: string) => {
    if (!auth) {
      return {
        hasAccess: false,
        status: 'SIGN_IN_REQUIRED' as const,
        message: 'Please sign in with an account that has access.'
      };
    }

    if (ownerHasUniversalAccess || unlockedEpisodeIds.has(episodeId)) {
      return {
        hasAccess: true,
        status: 'ACTIVE' as const,
        message: 'Active access is available for this episode.'
      };
    }

    return {
      hasAccess: false,
      status: 'NO_ACCESS' as const,
      message: 'You do not currently have access to this episode.'
    };
  };

  return NextResponse.json(
    {
      title: {
        id: title.id,
        title: title.title,
        description: title.description,
        videoType: title.videoType,
        ageRating: title.ageRating,
        category: title.category,
        genres: title.genres,
        teaserSec: title.teaserSec,
        durationSec: title.durationSec,
        releaseYear: title.releaseYear,
        highlightSeconds: title.highlightSeconds,
        posterKey: title.posterKey,
        creatorId: title.creatorId,
        seriesId: title.seriesId,
        seasonNumber: title.seasonNumber,
        episodeNumber: title.episodeNumber,
        previewAvailable:
          Boolean(title.technicalMetadata?.trailerKey?.trim()) ||
          title.teaserSec > 0,
        metadata: {
          vendorId: title.technicalMetadata?.vendorId ?? null,
          studioReleaseTitle: title.technicalMetadata?.studioReleaseTitle ?? null,
          countriesOfOrigin: title.technicalMetadata?.countriesOfOrigin ?? [],
          licensedTerritories: title.technicalMetadata?.licensedTerritories ?? [],
          copyrightLine: title.technicalMetadata?.copyrightLine ?? null,
          castCredits: title.technicalMetadata?.castCredits ?? null,
          crewCredits: title.technicalMetadata?.crewCredits ?? null
        },
        progressSec: historyByVideoId.get(title.id) ?? 0,
        trailerUrl: title.technicalMetadata?.trailerKey?.trim()
          ? `/api/media/${title.technicalMetadata.trailerKey.trim()}`
          : null,
        audioLanguages: title.audioLanguages,
        subtitleTracks: title.subtitleTracks.map(mapSubtitleTrack),
        episodes: title.episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          teaserSec: episode.teaserSec,
          durationSec: episode.durationSec,
          posterKey: episode.posterKey,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber,
          previewAvailable:
            Boolean(episode.technicalMetadata?.trailerKey?.trim()) ||
            episode.teaserSec > 0,
          progressSec: historyByVideoId.get(episode.id) ?? 0,
          trailerUrl: episode.technicalMetadata?.trailerKey?.trim()
            ? `/api/media/${episode.technicalMetadata.trailerKey.trim()}`
            : null,
          audioLanguages: episode.audioLanguages,
          subtitleTracks: episode.subtitleTracks.map(mapSubtitleTrack),
          access: mapEpisodeAccess(episode.id)
        }))
      },
      access
    },
    {
      headers: {
        Vary: 'authorization, cookie',
        'Cache-Control': auth
          ? 'private, max-age=15, stale-while-revalidate=60'
          : 'public, s-maxage=30, stale-while-revalidate=120'
      }
    }
  );
}
