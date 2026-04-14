import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMobileViewerAccessState } from '@/lib/mobile-viewer-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const title = await prisma.video.findUnique({
    where: { id: params.id },
    include: {
      episodes: {
        where: { status: 'APPROVED' },
        orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }]
      }
    }
  });

  if (!title) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (title.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const auth = await getAuthFromRequest(req);
  const access = await getMobileViewerAccessState(auth, { id: title.id, creatorId: title.creatorId });

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
        episodes: title.episodes.map((episode) => ({
          id: episode.id,
          title: episode.title,
          description: episode.description,
          teaserSec: episode.teaserSec,
          durationSec: episode.durationSec,
          posterKey: episode.posterKey,
          seasonNumber: episode.seasonNumber,
          episodeNumber: episode.episodeNumber
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
