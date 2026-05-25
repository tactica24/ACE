import { NextRequest, NextResponse } from 'next/server';
import { createGuestPreviewStreamToken, createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSignedHlsDeliveryUrl } from '@/lib/hls-delivery';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { normalizePlaybackQualityPreference } from '@/lib/playback-quality';
import { getPlayableHlsUrl, hasPlayableHls } from '@/lib/playback-delivery';
import { getPlaybackAssetSnapshot } from '@/lib/playback-assets';
import { getBucketForStorageKey, getObjectMetadata } from '@/lib/r2';

import { ensureStreamSession } from '@/lib/stream-sessions';
import { canPreviewVideo, isSeriesContainer } from '@/lib/video-access';
import { getVideoAvailabilityDecision } from '@/lib/video-availability';

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
      fallbackR2Key: true,
      hlsUrl: true,
      teaserSec: true,
      durationSec: true,
      technicalMetadata: {
        select: {
          trailerKey: true,
          playbackUrl: true,
          hlsPlaybackUrl: true,
          masterKey: true,
          processingStatus: true,
          availabilityRegion: true
        }
      }
    }
  });
  if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const canPreviewPendingVideo = canPreviewVideo(video, auth);
  if (!['APPROVED', 'PUBLISHED'].includes(video.status) && !canPreviewPendingVideo) {
    return NextResponse.json({ error: 'Video not available' }, { status: 403 });
  }
  if (isSeriesContainer(video)) {
    return NextResponse.json({ error: 'Select an episode to start playback.' }, { status: 400 });
  }

  const availability = getVideoAvailabilityDecision(video.technicalMetadata?.availabilityRegion, req);
  const canBypassAvailability = Boolean(auth && (auth.role === 'ADMIN' || auth.sub === video.creatorId));
  if (!teaser && !availability.allowed && !canBypassAvailability) {
    return NextResponse.json({
      error: 'This title is licensed for Africa only and cannot be watched from your current location.',
      reason: 'GEO_BLOCKED',
      availabilityRegion: availability.region,
      country: availability.country
    }, { status: 403 });
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

  const requestedQuality = normalizePlaybackQualityPreference(req.nextUrl.searchParams.get('quality'));
  const finalHlsUrl = getPlayableHlsUrl(video);
  const primaryProgressiveKey = video.r2Key?.trim() || null;
  const fallbackProgressiveKey = video.fallbackR2Key?.trim() || null;
  const masterProgressiveKey = video.technicalMetadata?.masterKey?.trim() || null;
  const assetSnapshot = await getPlaybackAssetSnapshot(video.id, primaryProgressiveKey, fallbackProgressiveKey, masterProgressiveKey);
  const playableHlsUrl = finalHlsUrl && assetSnapshot.hlsReady ? finalHlsUrl : null;
  const playableProgressiveKey = assetSnapshot.progressiveReady
    ? assetSnapshot.progressiveKey
    : assetSnapshot.fallbackProgressiveReady
      ? assetSnapshot.fallbackProgressiveKey
      : assetSnapshot.masterProgressiveReady
        ? assetSnapshot.masterProgressiveKey
        : null;

  if (teaser && !fullAccess && !playableHlsUrl && !playableProgressiveKey) {
    return NextResponse.json(
      {
        error: 'Movie preview is not available for this title yet.',
        reason: 'PREVIEW_UNAVAILABLE'
      },
      { status: 409 }
    );
  }

  if (!playableHlsUrl && !playableProgressiveKey) {
    return NextResponse.json({
      error: 'Playback assets are not ready for this title yet.'
    }, { status: 409 });
  }

  const selectedProgressive = !playableHlsUrl && playableProgressiveKey
    ? {
        key: playableProgressiveKey,
        quality: video.technicalMetadata?.masterKey ? 'master' : 'progressive'
      }
    : {
        key: null,
        quality: null
      };

  let streamBytes: number | undefined;
  let streamContentType: string | undefined;
  if (selectedProgressive.key) {
    try {
      const progBucket = getBucketForStorageKey(selectedProgressive.key);
      const metadata = await getObjectMetadata(selectedProgressive.key, progBucket);
      streamBytes = typeof metadata.ContentLength === 'number' ? metadata.ContentLength : undefined;
      streamContentType = metadata.ContentType ?? undefined;
    } catch {
      streamBytes = undefined;
      streamContentType = undefined;
    }
  }

  const hlsAvailable = Boolean(playableHlsUrl) && hasPlayableHls(video) && !selectedProgressive.key;
  const dashAvailable = false;

  const token = auth
    ? createStreamToken({
        userId: auth.sub,
        videoId,
        deviceSessionId,
        role: auth.role,
        fullAccess,
        previewAsset: false,
        streamKey: selectedProgressive.key ?? undefined,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec,
        streamBytes,
        streamContentType
      })
    : createGuestPreviewStreamToken({
        videoId,
        previewAsset: false,
        streamKey: selectedProgressive.key ?? undefined,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec,
        streamBytes,
        streamContentType
      });

  const progressiveUrl = selectedProgressive.key
    ? `/api/stream/${videoId}?token=${encodeURIComponent(token)}`
    : null;
  const hlsUrl = hlsAvailable
    ? getSignedHlsDeliveryUrl(videoId, token)
    : null;
  const dashUrl = null;

  return NextResponse.json({
    token,
    guest: !auth,
    playback: {
      progressiveUrl,
      progressiveQuality: selectedProgressive.quality,
      availableProgressiveQualities: selectedProgressive.key ? [selectedProgressive.quality ?? 'progressive'] : [],
      hlsUrl,
      dashUrl,
      hlsAvailable,
      dashAvailable,
      requestedQuality,
      preferred: hlsAvailable
        ? 'hls'
        : progressiveUrl
        ? 'progressive'
        : 'unavailable'
    }
  });
}




