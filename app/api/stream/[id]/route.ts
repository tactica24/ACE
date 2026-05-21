import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { cacheExists, getCachePath } from '@/lib/cache';
import { recordCacheHit } from '@/lib/metrics';
import { getObjectMetadata } from '@/lib/r2';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';
import { ensureCached, streamFile, streamR2Object } from '@/lib/stream';
import { touchStreamSession } from '@/lib/stream-sessions';
import { getBucketForStorageKey } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StreamPayload = {
  userId?: string;
  videoId: string;
  guest?: boolean;
  deviceSessionId?: string;
  role?: 'USER' | 'CREATOR' | 'ADMIN';
  fullAccess?: boolean;
  previewAsset?: boolean;
  streamKey?: string;
  teaserSec?: number;
  durationSec?: number;
  streamBytes?: number;
  streamContentType?: string;
};

function getTeaserRatio(payload: StreamPayload) {
  const durationSec = Math.max(payload.durationSec ?? 0, 1);
  const teaserSec = Math.max(payload.teaserSec ?? 0, 0);
  return Math.min(teaserSec / durationSec, 1);
}

function getMaxPreviewBytes(totalBytes: number, payload: StreamPayload) {
  const ratio = getTeaserRatio(payload);
  return Math.max(Math.floor(totalBytes * ratio), Math.min(totalBytes, 1024 * 512));
}

function getStreamCacheControl(isGuest: boolean, fullAccess: boolean) {
  if (isGuest && !fullAccess) {
    return 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';
  }

  return 'private, max-age=0, no-store';
}

function getStreamResponseHeaders(baseHeaders: HeadersInit, isGuest: boolean, fullAccess: boolean) {
  const cacheControl = getStreamCacheControl(isGuest, fullAccess);
  const headers = new Headers(baseHeaders);
  headers.set('Cache-Control', cacheControl);
  headers.set('Vary', 'Range');

  if (isGuest && !fullAccess) {
    headers.set('CDN-Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
    headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400');
  }

  return headers;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const relayBase = getRelayBaseUrl(req);
  if (shouldRedirectToRelay(req, relayBase)) {
    return Response.redirect(buildRelayUrl(req, relayBase!), 307);
  }

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 401 });

  let payload: StreamPayload;
  try {
    payload = verifyStreamToken(token) as StreamPayload;
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  if (payload.videoId !== params.id) return new Response('Token mismatch', { status: 403 });
  if (!payload.streamKey) return new Response('Select an episode to start playback', { status: 400 });

  const isGuest = payload.guest || !payload.userId || payload.userId === 'guest';
  if (!isGuest && payload.userId) {
    await touchStreamSession({
      userId: payload.userId,
      deviceSessionId: payload.deviceSessionId,
      videoId: payload.videoId
    });
  }

  const rangeHeader = req.headers.get('range');
  let maxBytes: number | undefined;

  if (!payload.fullAccess && !payload.previewAsset && (payload.durationSec ?? 0) > 0) {
    if (!relayBase) {
      if (typeof payload.streamBytes === 'number' && payload.streamBytes > 0) {
        maxBytes = getMaxPreviewBytes(payload.streamBytes, payload);
      } else {
        const streamBucket = getBucketForStorageKey(payload.streamKey);
        const objectHead = await getObjectMetadata(payload.streamKey, streamBucket);
        const fallbackSize = typeof objectHead.ContentLength === 'number' ? objectHead.ContentLength : 0;
        maxBytes = getMaxPreviewBytes(fallbackSize, payload);
      }
    } else {
      const hit = await cacheExists(payload.streamKey);
      recordCacheHit(hit);
      const streamBucket = getBucketForStorageKey(payload.streamKey);
      const filePath = hit ? getCachePath(payload.streamKey) : await ensureCached(payload.streamKey, streamBucket);
      const stat = await fsPromises.stat(filePath);
      maxBytes = getMaxPreviewBytes(stat.size, payload);
      const result = await streamFile(filePath, rangeHeader, maxBytes);

      return new Response(Readable.toWeb(result.stream) as never, {
        status: result.status,
        headers: getStreamResponseHeaders(result.headers, isGuest, Boolean(payload.fullAccess))
      });
    }
  }

  if (relayBase) {
    const hit = await cacheExists(payload.streamKey);
    recordCacheHit(hit);
    const relayBucket = getBucketForStorageKey(payload.streamKey);
    const filePath = hit ? getCachePath(payload.streamKey) : await ensureCached(payload.streamKey, relayBucket);
    const result = await streamFile(filePath, rangeHeader, maxBytes);

    return new Response(Readable.toWeb(result.stream) as never, {
      status: result.status,
      headers: getStreamResponseHeaders(result.headers, isGuest, Boolean(payload.fullAccess))
    });
  }

  const streamBucket = getBucketForStorageKey(payload.streamKey);
  const result = await streamR2Object(payload.streamKey, rangeHeader, maxBytes, streamBucket);

  return new Response(Readable.toWeb(result.stream) as never, {
    status: result.status,
    headers: getStreamResponseHeaders(result.headers, isGuest, Boolean(payload.fullAccess))
  });
}
