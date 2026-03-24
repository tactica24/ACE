import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, createStreamToken } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  const teaser = req.nextUrl.searchParams.get('teaser') === '1';
  if (!auth && !teaser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  if (video.status !== 'APPROVED') return NextResponse.json({ error: 'Video not available' }, { status: 403 });

  const token = auth
    ? createStreamToken({ userId: auth.sub, videoId })
    : createStreamToken({ videoId, guest: true, userId: 'guest' });
  return NextResponse.json({ token, guest: !auth });
}




