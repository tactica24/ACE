import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { cacheExists, getCachePath } from '@/lib/cache';
import { getDashAssetKey, getDashContentType, rewriteDashManifestUris } from '@/lib/dash';
import { recordCacheHit } from '@/lib/metrics';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';
import { ensureCached, streamFile } from '@/lib/stream';
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
};

export async function GET(req: NextRequest, { params }: { params: { id: string; asset: string[] } }) {
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

  // DASH playlists are available only for full-access sessions.
  if (!payload.fullAccess) {
    return new Response('Unlock required', { status: 403 });
  }

  const isGuest = payload.guest || !payload.userId || payload.userId === 'guest';
  if (!isGuest && payload.userId) {
    await touchStreamSession({
      userId: payload.userId,
      deviceSessionId: payload.deviceSessionId,
      videoId: payload.videoId
    });
  }

  const assetPath = params.asset.join('/');
  const key = getDashAssetKey(payload.videoId, assetPath);
  const hit = await cacheExists(key);
  recordCacheHit(hit);
  const filePath = hit ? getCachePath(key) : await ensureCached(key);

  if (assetPath.endsWith('.mpd')) {
    let manifest = await fsPromises.readFile(filePath, 'utf8');
    const prefix = assetPath.includes('/') ? assetPath.split('/').slice(0, -1).join('/') : '';
    manifest = rewriteDashManifestUris(manifest, (value) => {
      const normalized = prefix ? `${prefix}/${value}`.replace(/\/\//g, '/') : value;
      return `/api/dash/${payload.videoId}/${normalized}?token=${encodeURIComponent(token)}`;
    });
    return new Response(manifest, {
      headers: {
        'Content-Type': getDashContentType(assetPath),
        'Cache-Control': 'private, max-age=0, no-store'
      }
    });
  }

  const result = await streamFile(filePath, req.headers.get('range'));
  return new Response(Readable.toWeb(result.stream) as never, {
    status: result.status,
    headers: {
      ...result.headers,
      'Content-Type': getDashContentType(assetPath),
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
