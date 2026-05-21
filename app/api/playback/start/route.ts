import { NextRequest, NextResponse } from 'next/server';
import { createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSignedHlsDeliveryUrl } from '@/lib/hls-delivery';
import { getPlayableHlsUrl, getPlayableProgressiveKey } from '@/lib/playback-delivery';
import { ensureStreamSession } from '@/lib/stream-sessions';
import { getVideoAvailabilityDecision } from '@/lib/video-availability';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const movieId = typeof body.movieId === 'string' ? body.movieId.trim() : '';
  const deviceSessionId =
    typeof body.deviceSessionId === 'string' && body.deviceSessionId.trim()
      ? body.deviceSessionId.trim()
      : '';

  if (!movieId) {
    return NextResponse.json({ error: 'movieId required' }, { status: 400 });
  }

  if (!deviceSessionId) {
    return NextResponse.json({ error: 'Missing playback session.', reason: 'SESSION_REQUIRED' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: movieId },
    select: {
      id: true,
      title: true,
      status: true,
      r2Key: true,
      fallbackR2Key: true,
      hlsUrl: true,
      teaserSec: true,
      durationSec: true,
      technicalMetadata: {
        select: {
          playbackUrl: true,
          hlsPlaybackUrl: true,
          masterKey: true,
          processingStatus: true,
          availabilityRegion: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  }

  const hlsUrl = getPlayableHlsUrl(video);
  const progressiveKey = getPlayableProgressiveKey(video);

  if (!['APPROVED', 'PUBLISHED'].includes(video.status) || (!hlsUrl && !progressiveKey)) {
    return NextResponse.json({ error: 'Movie not available' }, { status: 403 });
  }
  const availability = getVideoAvailabilityDecision(video.technicalMetadata.availabilityRegion, req);
  if (!availability.allowed) {
    return NextResponse.json({
      error: 'This title is licensed for Africa only and cannot be watched from your current location.',
      reason: 'GEO_BLOCKED',
      availabilityRegion: availability.region,
      country: availability.country
    }, { status: 403 });
  }

  const unlock = await prisma.unlock.findFirst({
    where: { userId: auth.sub, videoId: movieId }
  });

  if (!unlock) {
    return NextResponse.json({ allowed: false, reason: 'NOT_UNLOCKED' }, { status: 403 });
  }

  const streamSession = await ensureStreamSession({
    userId: auth.sub,
    deviceSessionId,
    videoId: movieId
  });

  if (!streamSession.allowed) {
    return NextResponse.json(
      {
        error: 'This account is already active on 3 devices. Stop playback on one device to continue.',
        reason: 'SESSION_LIMIT'
      },
      { status: 429 }
    );
  }

  const session = await prisma.playbackSession.create({
    data: {
      userId: auth.sub,
      videoId: movieId,
      ipHash: '',
      userAgent: req.headers.get('user-agent') || undefined
    }
  });

  const token = createStreamToken({
    userId: auth.sub,
    videoId: movieId,
    deviceSessionId,
    role: auth.role,
    fullAccess: true,
    streamKey: hlsUrl ? undefined : progressiveKey ?? undefined,
    teaserSec: video.teaserSec,
    durationSec: video.durationSec
  });

  const playbackUrl = hlsUrl
    ? getSignedHlsDeliveryUrl(movieId, token)
    : `/api/stream/${movieId}?token=${encodeURIComponent(token)}`;

  return NextResponse.json({
    allowed: true,
    movieId,
    playbackUrl,
    playbackType: hlsUrl ? 'hls' : 'progressive',
    sessionId: session.id
  });
}
