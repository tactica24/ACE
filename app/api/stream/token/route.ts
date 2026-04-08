import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, createStreamToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { ensureStreamSession } from '@/lib/stream-sessions';
import { canPreviewVideo, isPlayableVideo } from '@/lib/video-access';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  const teaser = req.nextUrl.searchParams.get('teaser') === '1';
  if (!auth && !teaser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    key: `stream-token:${getRateLimitIdentity(req, auth?.sub)}`,
    limit: 120,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many playback requests right now. Please wait a moment and try again.' }, { status: 429 });
  }

  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const canPreviewPendingVideo = canPreviewVideo(video, auth);
  if (video.status !== 'APPROVED' && !canPreviewPendingVideo) {
    return NextResponse.json({ error: 'Video not available' }, { status: 403 });
  }
  if (!isPlayableVideo(video)) {
    return NextResponse.json({ error: 'Select an episode to start playback.' }, { status: 400 });
  }

  const deviceSessionId = req.nextUrl.searchParams.get('deviceSessionId') ?? undefined;
  if (auth) {
    if (!deviceSessionId) {
      return NextResponse.json({ error: 'Missing playback session.', reason: 'SESSION_REQUIRED' }, { status: 400 });
    }

    const session = await ensureStreamSession({
      userId: auth.sub,
      deviceSessionId,
      videoId
    });

    if (!session.allowed) {
      return NextResponse.json(
        {
          error: 'This account is already active on 3 devices. Stop playback on one device to continue.',
          reason: 'SESSION_LIMIT'
        },
        { status: 429 }
      );
    }
  }

  const token = auth
    ? createStreamToken({ userId: auth.sub, videoId, deviceSessionId, role: auth.role })
    : createStreamToken({ videoId, guest: true, userId: 'guest' });
  return NextResponse.json({ token, guest: !auth });
}




