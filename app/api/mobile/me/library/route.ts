import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMoviePosterUrlFromCandidates } from '@/lib/movie-assets';
import { getViewerReadyAnyVideoWhere } from '@/lib/video-visibility';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);

  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const unlocks = await prisma.unlock.findMany({
    where: { userId: auth.sub, video: getViewerReadyAnyVideoWhere() },
    orderBy: { createdAt: 'desc' },
    include: {
        video: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            videoType: true,
            ageRating: true,
            posterKey: true,
            series: {
              select: {
                posterKey: true
              }
            },
            teaserSec: true,
            durationSec: true
          }
        }
    }
  });

  return NextResponse.json({
    titles: unlocks.map((unlock) => ({
      id: unlock.video.id,
      title: unlock.video.title,
      description: unlock.video.description,
      category: unlock.video.category,
      videoType: unlock.video.videoType,
      ageRating: unlock.video.ageRating,
      posterKey: unlock.video.posterKey ?? unlock.video.series?.posterKey ?? null,
      posterUrl: getMoviePosterUrlFromCandidates(unlock.video, unlock.video, unlock.video.series),
      teaserSec: unlock.video.teaserSec,
      durationSec: unlock.video.durationSec,
      accessGrantedAt: unlock.createdAt.toISOString(),
      accessStatus: 'ACTIVE'
    }))
  });
}
