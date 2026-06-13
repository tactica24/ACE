import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getBunnyTrailerPlaybackUrl } from '@/lib/bunny-stream';
import { prisma } from '@/lib/db';
import { createSignedStorageUrl } from '@/lib/bunny-storage';
import { normalizeMediaKey } from '@/lib/media';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(_req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      technicalMetadata: {
        select: {
          trailerKey: true,
          trailerStreamVideoId: true,
          trailerStreamReadyAt: true
        }
      }
    }
  });

  const trailerPlaybackUrl = getBunnyTrailerPlaybackUrl(video);
  if (trailerPlaybackUrl) {
    return NextResponse.redirect(trailerPlaybackUrl);
  }

  const trailerKey = normalizeMediaKey(video?.technicalMetadata?.trailerKey) ?? '';
  if (!trailerKey) {
    return NextResponse.json({ error: 'Trailer not available for this title.' }, { status: 404 });
  }

  const url = await createSignedStorageUrl(trailerKey);
  return NextResponse.redirect(url);
}
