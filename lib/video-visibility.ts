import { Prisma } from '@prisma/client';

const mp4KeyFilter = { endsWith: '.mp4', mode: Prisma.QueryMode.insensitive } satisfies Prisma.StringNullableFilter;

export function getPlayableAssetWhere(): Prisma.VideoWhereInput {
  return {
    OR: [
      { primaryStorageKey: mp4KeyFilter },
      { fallbackStorageKey: mp4KeyFilter },
      { technicalMetadata: { is: { masterKey: mp4KeyFilter } } }
    ]
  };
}

export function getViewerReadyEpisodeWhere(): Prisma.VideoWhereInput {
  return {
    status: { in: ['APPROVED', 'PUBLISHED'] },
    ...getPlayableAssetWhere()
  };
}

export function getViewerReadyAnyVideoWhere(): Prisma.VideoWhereInput {
  return {
    status: { in: ['APPROVED', 'PUBLISHED'] },
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
