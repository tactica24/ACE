import { NextRequest, NextResponse } from 'next/server';
import { createGuestPreviewStreamToken, createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { getDashManifestKey } from '@/lib/dash';
import { getHlsMasterKey } from '@/lib/hls';
import { getObjectMetadata } from '@/lib/r2';
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

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      creatorId: true,
      status: true,
      videoType: true,
      seriesId: true,
      r2Key: true,
      teaserSec: true,
      durationSec: true
    }
  });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const canPreviewPendingVideo = canPreviewVideo(video, auth);
  if (video.status !== 'APPROVED' && !canPreviewPendingVideo) {
    return NextResponse.json({ error: 'Video not available' }, { status: 403 });
  }
  if (!isPlayableVideo(video)) {
    return NextResponse.json({ error: 'Select an episode to start playback.' }, { status: 400 });
  }

  const deviceSessionId = req.nextUrl.searchParams.get('deviceSessionId') ?? undefined;
  let fullAccess = false;
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

    const unlock = await prisma.unlock.findFirst({
      where: { userId: auth.sub, videoId }
    });
    fullAccess = Boolean(unlock) || auth.sub === video.creatorId || auth.role === 'ADMIN';
  }

  let streamBytes: number | undefined;
  let streamContentType: string | undefined;
  if (video.r2Key) {
    try {
      const metadata = await getObjectMetadata(video.r2Key);
      streamBytes = typeof metadata.ContentLength === 'number' ? metadata.ContentLength : undefined;
      streamContentType = metadata.ContentType ?? undefined;
    } catch {
      streamBytes = undefined;
      streamContentType = undefined;
    }
  }

  const hasObject = async (key: string) => {
    try {
      await getObjectMetadata(key);
      return true;
    } catch {
      return false;
    }
  };

  const [hlsAvailable, dashAvailable] = await Promise.all([
    hasObject(getHlsMasterKey(videoId)),
    fullAccess ? hasObject(getDashManifestKey(videoId)) : Promise.resolve(false)
  ]);

  const token = auth
    ? createStreamToken({
        userId: auth.sub,
        videoId,
        deviceSessionId,
        role: auth.role,
        fullAccess,
        streamKey: video.r2Key ?? undefined,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec,
        streamBytes,
        streamContentType
      })
    : createGuestPreviewStreamToken({
        videoId,
        streamKey: video.r2Key ?? undefined,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec,
        streamBytes,
        streamContentType
      });

  const progressiveUrl = `/api/stream/${videoId}?token=${encodeURIComponent(token)}`;
  const hlsUrl = hlsAvailable ? `/api/hls/${videoId}/master.m3u8?token=${encodeURIComponent(token)}` : null;
  const dashUrl = dashAvailable ? `/api/dash/${videoId}/manifest.mpd?token=${encodeURIComponent(token)}` : null;

  return NextResponse.json({
    token,
    guest: !auth,
    playback: {
      progressiveUrl,
      hlsUrl,
      dashUrl,
      hlsAvailable,
      dashAvailable,
      preferred: hlsAvailable ? 'hls' : dashAvailable ? 'dash' : 'progressive'
    }
  });
}




