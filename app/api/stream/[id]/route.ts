import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { cacheExists, getCachePath } from '@/lib/cache';
import { recordCacheHit } from '@/lib/metrics';
import { headObject } from '@/lib/r2';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';
import { ensureCached, streamFile, streamR2Object } from '@/lib/stream';
import { touchStreamSession } from '@/lib/stream-sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StreamPayload = {
  userId?: string;
  videoId: string;
  guest?: boolean;
  deviceSessionId?: string;
  role?: 'USER' | 'CREATOR' | 'ADMIN';
  fullAccess?: boolean;
  streamKey?: string;
  teaserSec?: number;
  durationSec?: number;
};

function getTeaserRatio(payload: StreamPayload) {
  const durationSec = Math.max(payload.durationSec ?? 0, 1);
  const teaserSec = Math.max(payload.teaserSec ?? 0, 0);
  return Math.min(teaserSec / durationSec, 1);
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

  if (!payload.fullAccess && (payload.durationSec ?? 0) > 0) {
    const ratio = getTeaserRatio(payload);

    if (!relayBase) {
      const objectHead = await headObject(payload.streamKey);
      const objectSize = typeof objectHead.ContentLength === 'number' ? objectHead.ContentLength : 0;
      maxBytes = Math.max(Math.floor(objectSize * ratio), Math.min(objectSize, 1024 * 512));
    } else {
      const hit = await cacheExists(payload.streamKey);
      recordCacheHit(hit);
      const filePath = hit ? getCachePath(payload.streamKey) : await ensureCached(payload.streamKey);
      const stat = await fsPromises.stat(filePath);
      maxBytes = Math.max(Math.floor(stat.size * ratio), Math.min(stat.size, 1024 * 512));
      const result = await streamFile(filePath, rangeHeader, maxBytes);

      return new Response(Readable.toWeb(result.stream) as never, {
        status: result.status,
        headers: {
          ...result.headers,
          'Cache-Control': 'private, max-age=0, no-store'
        }
      });
    }
  }

  if (relayBase) {
    const hit = await cacheExists(payload.streamKey);
    recordCacheHit(hit);
    const filePath = hit ? getCachePath(payload.streamKey) : await ensureCached(payload.streamKey);
    const result = await streamFile(filePath, rangeHeader, maxBytes);

    return new Response(Readable.toWeb(result.stream) as never, {
      status: result.status,
      headers: {
        ...result.headers,
        'Cache-Control': 'private, max-age=0, no-store'
      }
    });
  }

  const result = await streamR2Object(payload.streamKey, rangeHeader, maxBytes);

  return new Response(Readable.toWeb(result.stream) as never, {
    status: result.status,
    headers: {
      ...result.headers,
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
