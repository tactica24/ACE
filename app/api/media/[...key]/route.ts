import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPresignedGetUrl } from '@/lib/r2';
import { canPreviewVideo } from '@/lib/video-access';

export async function GET(req: NextRequest, { params }: { params: { key?: string[] } }) {
  const key = params.key?.join('/');
  if (!key) {
    return NextResponse.json({ error: 'Missing asset key' }, { status: 400 });
  }

  try {
    const auth = await getAuthFromRequest(req);
    const video = await prisma.video.findFirst({
      where: {
        OR: [
          { posterKey: key },
          { subtitleTracks: { some: { fileKey: key } } }
        ]
      },
      select: {
        creatorId: true,
        status: true,
        videoType: true,
        seriesId: true,
        r2Key: true
      }
    });

    if (!video) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
    }

    if (video.status !== 'APPROVED' && !canPreviewVideo(video, auth)) {
      return NextResponse.json({ error: 'Asset not available' }, { status: 403 });
    }

    const url = await createPresignedGetUrl(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
  }
}
