import { NextRequest, NextResponse } from 'next/server';
import { createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSignedStoredMediaUrl } from '@/lib/media-delivery';
import {
  getPlayableProgressiveKey,
  getPlayableProgressiveKeyCandidates,
  getPlayableProgressiveUrl
} from '@/lib/playback-delivery';
import { getPlaybackAssetSnapshot } from '@/lib/playback-assets';
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
      creatorId: true,
      title: true,
      status: true,
      r2Key: true,
      fallbackR2Key: true,
      teaserSec: true,
      durationSec: true,
      technicalMetadata: {
        select: {
          playbackUrl: true,
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

  const progressiveKey = getPlayableProgressiveKey(video);
  const progressiveKeyCandidates = getPlayableProgressiveKeyCandidates(video);
  const progressiveUrl = getPlayableProgressiveUrl(video);
  const primaryProgressiveKey = video.r2Key?.trim() || null;
  const fallbackProgressiveKey = video.fallbackR2Key?.trim() || null;
  const masterProgressiveKey = video.technicalMetadata?.masterKey?.trim() || null;

  if (!['APPROVED', 'PUBLISHED'].includes(video.status) || (!progressiveKey && !progressiveUrl)) {
    return NextResponse.json({ error: 'Movie not available' }, { status: 403 });
  }
  const availability = getVideoAvailabilityDecision(video.technicalMetadata?.availabilityRegion, req);
  const canBypassAvailability = auth.role === 'ADMIN' || auth.sub === video.creatorId;
  if (!availability.allowed && !canBypassAvailability) {
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
  const hasFullAccess = Boolean(unlock) || auth.sub === video.creatorId || auth.role === 'ADMIN';

  if (!hasFullAccess) {
    return NextResponse.json({ allowed: false, reason: 'NOT_UNLOCKED' }, { status: 403 });
  }

  const assetSnapshot = await getPlaybackAssetSnapshot(video.id, primaryProgressiveKey, fallbackProgressiveKey, masterProgressiveKey);
  const availableProgressiveKey = assetSnapshot.progressiveReady
    ? assetSnapshot.progressiveKey
    : assetSnapshot.fallbackProgressiveReady
      ? assetSnapshot.fallbackProgressiveKey
      : assetSnapshot.masterProgressiveReady
        ? assetSnapshot.masterProgressiveKey
        : progressiveKeyCandidates[0] ?? null;
  const availableProgressiveUrl = progressiveUrl;
  const streamKey = availableProgressiveKey;
  const directProgressiveUrl = streamKey ? null : availableProgressiveUrl;

  if (!streamKey && !directProgressiveUrl) {
    return NextResponse.json({
      error: 'MP4 playback assets are not ready for this title yet.'
    }, { status: 409 });
  }

  if (streamKey && !assetSnapshot.ready) {
    console.warn('[playback/start] issuing MP4 stream from stored key after inconclusive asset HEAD check', {
      movieId,
      storageConfigured: assetSnapshot.storageConfigured
    });
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
    streamKey: streamKey ?? undefined,
    teaserSec: video.teaserSec,
    durationSec: video.durationSec
  });

  const playbackUrl = streamKey
      ? `/api/stream/${movieId}?token=${encodeURIComponent(token)}`
      : directProgressiveUrl
        ? getSignedStoredMediaUrl(token, directProgressiveUrl)
        : null;

  if (!playbackUrl) {
    return NextResponse.json({
      error: 'MP4 playback assets are not ready for this title yet.'
    }, { status: 409 });
  }

  return NextResponse.json({
    allowed: true,
    movieId,
    playbackUrl,
    playbackType: 'progressive',
    sessionId: session.id
  });
}
