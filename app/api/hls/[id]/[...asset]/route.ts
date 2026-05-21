import fsPromises from 'fs/promises';
import { Readable } from 'stream';
import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { cacheExists, getCachePath } from '@/lib/cache';
import { getHlsAssetKey, getHlsContentType, rewriteManifestUris, trimPlaylistToTeaser } from '@/lib/hls';
import { recordCacheHit } from '@/lib/metrics';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';
import { getHlsBucket } from '@/lib/r2';
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
  teaserSec?: number;
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

  const isGuest = payload.guest || !payload.userId || payload.userId === 'guest';
  if (!isGuest && payload.userId) {
    await touchStreamSession({
      userId: payload.userId,
      deviceSessionId: payload.deviceSessionId,
      videoId: payload.videoId
    });
  }

  const assetPath = params.asset.join('/');
  const key = getHlsAssetKey(payload.videoId, assetPath);
  const bucket = getHlsBucket();
  const hit = await cacheExists(key);
  recordCacheHit(hit);
  const filePath = hit ? getCachePath(key) : await ensureCached(key, bucket);

  if (assetPath.endsWith('.m3u8')) {
    let manifest = await fsPromises.readFile(filePath, 'utf8');
    if (!payload.fullAccess) {
      manifest = trimPlaylistToTeaser(manifest, payload.teaserSec ?? 0);
    }
    const prefix = assetPath.includes('/') ? assetPath.split('/').slice(0, -1).join('/') : '';
    manifest = rewriteManifestUris(manifest, (value) => {
      const normalized = prefix ? `${prefix}/${value}`.replace(/\/\//g, '/') : value;
      return `/api/hls/${payload.videoId}/${normalized}?token=${encodeURIComponent(token)}`;
    });
    return new Response(manifest, {
      headers: {
        'Content-Type': getHlsContentType(assetPath),
        'Cache-Control': 'private, max-age=0, no-store'
      }
    });
  }

  const result = await streamFile(filePath, req.headers.get('range'));
  return new Response(Readable.toWeb(result.stream) as never, {
    status: result.status,
    headers: {
      ...result.headers,
      'Content-Type': getHlsContentType(assetPath),
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
