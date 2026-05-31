import { Prisma } from '@prisma/client';
import { VIEWER_VISIBLE_STATUSES } from './release-status';

const mp4KeyFilter = { endsWith: '.mp4', mode: Prisma.QueryMode.insensitive } satisfies Prisma.StringNullableFilter;

export function getPlayableAssetWhere(): Prisma.VideoWhereInput {
  return {
    OR: [
      {
        technicalMetadata: {
          is: {
            hlsManifestKey: { not: null },
            hlsReadyAt: { not: null }
          }
        }
      },
      { primaryStorageKey: mp4KeyFilter },
      { fallbackStorageKey: mp4KeyFilter }
    ]
  };
}

export function getViewerReadyEpisodeWhere(): Prisma.VideoWhereInput {
  return {
    status: { in: [...VIEWER_VISIBLE_STATUSES] },
    ...getPlayableAssetWhere()
  };
}

export function getViewerReadyAnyVideoWhere(): Prisma.VideoWhereInput {
  return {
    status: { in: [...VIEWER_VISIBLE_STATUSES] },
    OR: [
      {
        AND: [{ seriesId: { not: null } }, getPlayableAssetWhere()]
      },
      {
        AND: [{ seriesId: null }, { videoType: { not: 'SERIES' } }, getPlayableAssetWhere()]
      },
      {
        AND: [
          { videoType: 'SERIES' },
          {
            episodes: {
              some: getViewerReadyEpisodeWhere()
            }
          }
        ]
      }
    ]
  };
}

export function getViewerReadyCatalogWhere(): Prisma.VideoWhereInput {
  return {
    AND: [{ seriesId: null }, getViewerReadyAnyVideoWhere()]
  };
}

export function getViewerReadyVideoWhere(id: string): Prisma.VideoWhereInput {
  return {
    id,
    AND: [getViewerReadyAnyVideoWhere()]
  };
}
