import { Readable } from 'stream';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeMediaKey } from '@/lib/media';
import { isViewerVisibleStatus } from '@/lib/release-status';
import { streamStoredObject } from '@/lib/stream';
import { canPreviewVideo } from '@/lib/video-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function buildKeyCandidates(key: string) {
  const normalized = normalizeMediaKey(key);
  if (!normalized) return [];

  return uniqueValues([
    key,
    normalized,
    `/${normalized}`,
    normalized.replace(/\//g, '\\')
  ]);
}

function normalizedEquals(left?: string | null, right?: string | null) {
  return normalizeMediaKey(left) === normalizeMediaKey(right);
}

export async function GET(req: NextRequest, { params }: { params: { key?: string[] } }) {
  const key = params.key?.join('/');
  const normalizedKey = normalizeMediaKey(key);
  if (!key) {
    return NextResponse.json({ error: 'Missing asset key' }, { status: 400 });
  }

  try {
    const auth = await getAuthFromRequest(req);
    const keyCandidates = buildKeyCandidates(key);
    const fileName = normalizedKey?.split('/').pop() ?? '';
    const candidateVideos = await prisma.video.findMany({
      where: {
        OR: [
          { posterKey: { in: keyCandidates } },
          { subtitleTracks: { some: { fileKey: { in: keyCandidates } } } },
          { technicalMetadata: { is: { landscapeArtworkKey: { in: keyCandidates } } } },
          { technicalMetadata: { is: { trailerKey: { in: keyCandidates } } } },
          { technicalMetadata: { is: { promotionalStillKeys: { hasSome: keyCandidates } } } },
          ...(fileName
            ? [
                { posterKey: { contains: fileName } },
                { subtitleTracks: { some: { fileKey: { contains: fileName } } } },
                { technicalMetadata: { is: { landscapeArtworkKey: { contains: fileName } } } },
                { technicalMetadata: { is: { trailerKey: { contains: fileName } } } },
                { technicalMetadata: { is: { promotionalStillKeys: { has: key } } } }
              ]
            : [])
        ]
      },
      take: 20,
      select: {
        creatorId: true,
        status: true,
        videoType: true,
        seriesId: true,
        posterKey: true,
        primaryStorageKey: true,
        subtitleTracks: {
          select: {
            fileKey: true
          }
        },
        technicalMetadata: {
          select: {
            landscapeArtworkKey: true,
            trailerKey: true,
            promotionalStillKeys: true
          }
        }
      }
    });

    const matches = candidateVideos
      .map((video) => {
        const poster = normalizedEquals(video.posterKey, normalizedKey) ? video.posterKey : null;
        const subtitle = video.subtitleTracks.find((track) => normalizedEquals(track.fileKey, normalizedKey))?.fileKey ?? null;
        const promotionalStill = video.technicalMetadata?.promotionalStillKeys.find((item) => normalizedEquals(item, normalizedKey)) ?? null;
        const storedKey =
          poster ??
          (normalizedEquals(video.technicalMetadata?.landscapeArtworkKey, normalizedKey)
            ? video.technicalMetadata?.landscapeArtworkKey
            : normalizedEquals(video.technicalMetadata?.trailerKey, normalizedKey)
              ? video.technicalMetadata?.trailerKey
              : subtitle ?? promotionalStill);

        return storedKey ? { video, storedKey } : null;
      })
      .filter((match): match is NonNullable<typeof match> => Boolean(match));

    if (!matches.length) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
    }

    const match = matches.find(
      ({ video }) =>
        isViewerVisibleStatus(video.status) ||
        canPreviewVideo(video, auth) ||
        Boolean(auth && (auth.role === 'ADMIN' || auth.sub === video.creatorId))
    );
    if (!match) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 403 });
    }

    const { video, storedKey } = match;
    const objectKey = normalizeMediaKey(storedKey) ?? storedKey;
    const result = await streamStoredObject(objectKey, req.headers.get('range'));
    const publiclyCacheable = isViewerVisibleStatus(video.status);
    return new Response(Readable.toWeb(result.stream) as never, {
      status: result.status,
      headers: {
        ...result.headers,
        'Cache-Control': publiclyCacheable
          ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
          : 'private, max-age=0, no-store',
        Vary: 'Range'
      }
    });
  } catch (error) {
    console.error('[media-asset] delivery failed', {
      key: normalizedKey,
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
  }
}
