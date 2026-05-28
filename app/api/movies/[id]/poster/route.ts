import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { resolveMoviePosterKeyFromCandidates } from '@/lib/movie-assets';
import { createPresignedGetUrl } from '@/lib/r2';
import { canPreviewVideo } from '@/lib/video-access';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      creatorId: true,
      status: true,
      posterKey: true,
      series: {
        select: {
          posterKey: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Poster not found.' }, { status: 404 });
  }

  const auth = await getAuthFromRequest(req);
  const visible = ['APPROVED', 'PUBLISHED'].includes(video.status) || canPreviewVideo(video, auth);
  if (!visible) {
    return NextResponse.json({ error: 'Poster not available.' }, { status: 403 });
  }

  const posterKey = resolveMoviePosterKeyFromCandidates(video, video.series);
  if (!posterKey) {
    return NextResponse.json({ error: 'Poster not available.' }, { status: 404 });
  }

  return NextResponse.redirect(await createPresignedGetUrl(posterKey));
}
