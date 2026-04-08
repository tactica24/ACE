import fsPromises from 'fs/promises';
import { NextRequest } from 'next/server';
import { Readable } from 'stream';
import { verifyStreamToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cacheExists, getCachePath } from '@/lib/cache';
import { ensureCached, streamFile } from '@/lib/stream';
import { recordCacheHit } from '@/lib/metrics';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';
import { getHlsAssetKey, getHlsContentType, rewriteManifestUris, trimPlaylistToTeaser } from '@/lib/hls';
import { touchStreamSession } from '@/lib/stream-sessions';
import { canPreviewVideo, isPlayableVideo } from '@/lib/video-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string; asset: string[] } }) {
  const relayBase = getRelayBaseUrl(req);
  if (shouldRedirectToRelay(req, relayBase)) {
    return Response.redirect(buildRelayUrl(req, relayBase!), 307);
  }

  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 401 });

  let payload: { userId?: string; videoId: string; guest?: boolean; deviceSessionId?: string; role?: 'USER' | 'CREATOR' | 'ADMIN' };
  try {
    payload = verifyStreamToken(token);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  if (payload.videoId !== params.id) return new Response('Token mismatch', { status: 403 });

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return new Response('Video not found', { status: 404 });
  const canPreviewPendingVideo = canPreviewVideo(video, payload.userId ? { sub: payload.userId, role: payload.role ?? 'USER' } : null);
  if (video.status !== 'APPROVED' && !canPreviewPendingVideo) {
    return new Response('Video not available', { status: 403 });
  }
  if (!isPlayableVideo(video)) {
    return new Response('Select an episode to start playback', { status: 400 });
  }

  const isGuest = payload.guest || !payload.userId || payload.userId === 'guest';
  let unlocked = false;
  if (!isGuest && payload.userId) {
    const unlock = await prisma.unlock.findFirst({ where: { userId: payload.userId, videoId: video.id } });
    unlocked = Boolean(unlock) || payload.userId === video.creatorId;
    await touchStreamSession({ userId: payload.userId, deviceSessionId: payload.deviceSessionId, videoId: video.id });
  }

  const assetPath = params.asset.join('/');
  const key = getHlsAssetKey(video.id, assetPath);
  const hit = await cacheExists(key);
  recordCacheHit(hit);
  const filePath = hit ? getCachePath(key) : await ensureCached(key);

  if (assetPath.endsWith('.m3u8')) {
    let manifest = await fsPromises.readFile(filePath, 'utf8');
    if (!unlocked) {
      manifest = trimPlaylistToTeaser(manifest, video.teaserSec);
    }
    const prefix = assetPath.includes('/') ? assetPath.split('/').slice(0, -1).join('/') : '';
    manifest = rewriteManifestUris(manifest, (value) => {
      const normalized = prefix ? `${prefix}/${value}`.replace(/\/\//g, '/') : value;
      return `/api/hls/${video.id}/${normalized}?token=${encodeURIComponent(token)}`;
    });
    return new Response(manifest, {
      headers: {
        'Content-Type': getHlsContentType(assetPath),
        'Cache-Control': 'private, max-age=0, no-store'
      }
    });
  }

  const result = await streamFile(filePath, req.headers.get('range'));
  return new Response(Readable.toWeb(result.stream) as any, {
    status: result.status,
    headers: {
      ...result.headers,
      'Content-Type': getHlsContentType(assetPath),
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}
