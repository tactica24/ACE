import { NextRequest, NextResponse } from 'next/server';
import { createGuestPreviewStreamToken, createStreamToken, getAuthFromRequest } from '@/lib/auth';
import { createSignedStorageUrl } from '@/lib/bunny-storage';
import { prisma } from '@/lib/db';
import { createSignedHlsManifestUrl, resolveVideoHlsManifestKey } from '@/lib/hls';
import { getMovieMp4StorageStatus } from '@/lib/movie-storage';
import { ensureStreamSession } from '@/lib/stream-sessions';
import { canPreviewVideo, isSeriesContainer } from '@/lib/video-access';
import { getVideoAvailabilityDecision } from '@/lib/video-availability';

export const dynamic = 'force-dynamic';

async function getPlaybackPayload(req: NextRequest, videoId: string, requireFullAccess: boolean) {
  const auth = await getAuthFromRequest(req);
  if (requireFullAccess && !auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      creatorId: true,
      status: true,
      videoType: true,
      seriesId: true,
      primaryStorageKey: true,
      fallbackStorageKey: true,
      teaserSec: true,
      durationSec: true,
      technicalMetadata: {
        select: {
          masterKey: true,
          availabilityRegion: true,
          trailerKey: true,
          hlsManifestKey: true,
          hlsOutputPath: true,
          hlsReadyAt: true
        }
      }
    }
  });

  if (!video) {
    return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
  }

  if (isSeriesContainer(video)) {
    return NextResponse.json({ error: 'Select an episode to start playback.' }, { status: 400 });
  }

  const canPreview = canPreviewVideo(video, auth);
  if (!['APPROVED', 'PUBLISHED'].includes(video.status) && !canPreview) {
    return NextResponse.json({ error: 'Movie not available' }, { status: 403 });
  }

  const hlsManifestKey = resolveVideoHlsManifestKey(video);

  let fullAccess = false;
  if (auth) {
    const unlock = await prisma.unlock.findFirst({
      where: { userId: auth.sub, videoId },
      select: { id: true }
    });
    fullAccess = Boolean(unlock) || auth.sub === video.creatorId || auth.role === 'ADMIN';
  }

  if (requireFullAccess && !fullAccess) {
    return NextResponse.json({ allowed: false, reason: 'NOT_UNLOCKED' }, { status: 403 });
  }

  if (!requireFullAccess) {
    fullAccess = false;
  }

  if (fullAccess) {
    const availability = getVideoAvailabilityDecision(video.technicalMetadata?.availabilityRegion, req);
    const canBypassAvailability = Boolean(auth && (auth.role === 'ADMIN' || auth.sub === video.creatorId));
    if (!availability.allowed && !canBypassAvailability) {
      return NextResponse.json({
        error: 'This title is licensed for Africa only and cannot be watched from your current location.',
        reason: 'GEO_BLOCKED',
        availabilityRegion: availability.region,
        country: availability.country
      }, { status: 403 });
    }
  }

  const deviceSessionId =
    req.method === 'POST'
      ? ''
      : req.nextUrl.searchParams.get('deviceSessionId')?.trim() || undefined;

  const shouldCheckProgressive = !fullAccess || !hlsManifestKey || !video.technicalMetadata?.hlsReadyAt;
  const mp4Status = shouldCheckProgressive ? await getMovieMp4StorageStatus(video) : null;

  if (shouldCheckProgressive && !mp4Status?.selectedKey) {
    console.error('[movie-playback] progressive storage lookup failed', {
      videoId,
      bunnyStorageConfigured: mp4Status?.bunnyStorageConfigured,
      candidates: mp4Status?.candidates,
      error: mp4Status?.error
    });
    return NextResponse.json({
      error: mp4Status?.candidates.length
        ? 'The MP4 file listed for this title could not be found in storage. Re-upload the MP4 and validate the title.'
        : 'No playable video source is attached to this title.',
      details: process.env.NODE_ENV === 'development' ? mp4Status?.error : undefined
    }, { status: 409 });
  }

  return {
    auth,
    video,
    streamKey: mp4Status?.selectedKey ?? null,
    fullAccess,
    deviceSessionId,
    hlsManifestKey: fullAccess && video.technicalMetadata?.hlsReadyAt ? hlsManifestKey : null
  };
}

function buildPlaybackUrl(videoId: string, token: string) {
  return `/api/movies/${encodeURIComponent(videoId)}/stream?token=${encodeURIComponent(token)}`;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const requireFullAccess = req.nextUrl.searchParams.get('teaser') !== '1';
  const result = await getPlaybackPayload(req, params.id, requireFullAccess);
  if (result instanceof NextResponse) return result;

  const { auth, video, streamKey, fullAccess, deviceSessionId, hlsManifestKey } = result;
  const hlsUrl = hlsManifestKey ? createSignedHlsManifestUrl(hlsManifestKey) : null;
  const token = streamKey
    ? auth
      ? createStreamToken({
          userId: auth.sub,
          videoId: video.id,
          deviceSessionId,
          role: auth.role,
          fullAccess,
          streamKey,
          teaserSec: video.teaserSec,
          durationSec: video.durationSec
        })
      : createGuestPreviewStreamToken({
          videoId: video.id,
          fullAccess: false,
          streamKey,
          teaserSec: video.teaserSec,
          durationSec: video.durationSec
        })
    : null;

  const playbackUrl = token ? buildPlaybackUrl(video.id, token) : null;
  const previewUrl = video.technicalMetadata?.trailerKey
    ? createSignedStorageUrl(video.technicalMetadata.trailerKey, { expiresIn: 60 * 60 })
    : playbackUrl;

  return NextResponse.json({
    token,
    guest: !auth,
    playback: {
      previewUrl,
      hlsUrl,
      progressiveUrl: playbackUrl,
      preferred: previewUrl && previewUrl !== playbackUrl ? 'preview' : hlsUrl ? 'hls' : 'progressive',
      progressiveQuality: playbackUrl ? 'mp4' : null,
      availableProgressiveQualities: playbackUrl ? ['mp4'] : []
    }
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const deviceSessionId = typeof body.deviceSessionId === 'string' ? body.deviceSessionId.trim() : '';
  if (!deviceSessionId) {
    return NextResponse.json({ error: 'Missing playback session.', reason: 'SESSION_REQUIRED' }, { status: 400 });
  }

  const result = await getPlaybackPayload(req, params.id, true);
  if (result instanceof NextResponse) return result;
  const { auth, video, streamKey, hlsManifestKey } = result;
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const streamSession = await ensureStreamSession({
    userId: auth.sub,
    deviceSessionId,
    videoId: video.id
  });
  if (!streamSession.allowed) {
    return NextResponse.json({
      error: 'This account is already active on 3 devices. Stop playback on one device to continue.',
      reason: 'SESSION_LIMIT'
    }, { status: 429 });
  }

  const session = await prisma.playbackSession.create({
    data: {
      userId: auth.sub,
      videoId: video.id,
      ipHash: '',
      userAgent: req.headers.get('user-agent') || undefined
    }
  });

  const hlsUrl = hlsManifestKey ? createSignedHlsManifestUrl(hlsManifestKey) : null;
  const token = streamKey
    ? createStreamToken({
        userId: auth.sub,
        videoId: video.id,
        deviceSessionId,
        role: auth.role,
        fullAccess: true,
        streamKey,
        teaserSec: video.teaserSec,
        durationSec: video.durationSec
      })
    : null;

  return NextResponse.json({
    allowed: true,
    movieId: video.id,
    playbackUrl: hlsUrl ?? (token ? buildPlaybackUrl(video.id, token) : null),
    playback: {
      hlsUrl,
      progressiveUrl: token ? buildPlaybackUrl(video.id, token) : null,
      preferred: hlsUrl ? 'hls' : 'progressive'
    },
    playbackType: hlsUrl ? 'hls' : 'progressive',
    sessionId: session.id
  });
}
