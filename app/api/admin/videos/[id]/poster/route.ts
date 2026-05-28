import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPresignedGetUrl } from '@/lib/r2';
import { resolveMoviePosterKeyFromCandidates } from '@/lib/movie-assets';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      posterKey: true,
      series: {
        select: {
          posterKey: true
        }
      }
    }
  });

  const posterKey = resolveMoviePosterKeyFromCandidates(video, video?.series);

  if (!posterKey) {
    return NextResponse.json({ error: 'Poster artwork is not available for this title.' }, { status: 404 });
  }

  const url = await createPresignedGetUrl(posterKey);
  return NextResponse.redirect(url);
}
