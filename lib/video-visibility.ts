import { Prisma } from '@prisma/client';

export function getPlayableAssetWhere(): Prisma.VideoWhereInput {
  return {
    OR: [
      { r2Key: { not: null } },
      { fallbackR2Key: { not: null } },
      { technicalMetadata: { playbackUrl: { not: null } } },
      { technicalMetadata: { masterKey: { not: null } } },
      { technicalMetadata: { processingStatus: 'MASTER_UPLOADED' } }
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
