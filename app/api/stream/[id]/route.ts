import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cacheExists, getCachePath } from '@/lib/cache';
import { ensureCached, streamFile } from '@/lib/stream';
import { recordCacheHit } from '@/lib/metrics';
import { Readable } from 'stream';
import fsPromises from 'fs/promises';
import { buildRelayUrl, getRelayBaseUrl, shouldRedirectToRelay } from '@/lib/relay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const relayBase = getRelayBaseUrl(req);
  if (shouldRedirectToRelay(req, relayBase)) {
    return Response.redirect(buildRelayUrl(req, relayBase!), 307);
  }
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 401 });

  let payload: { userId?: string; videoId: string; guest?: boolean };
  try {
    payload = verifyStreamToken(token);
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  if (payload.videoId !== params.id) return new Response('Token mismatch', { status: 403 });

  const video = await prisma.video.findUnique({ where: { id: params.id } });
  if (!video) return new Response('Video not found', { status: 404 });
  if (video.status !== 'APPROVED') return new Response('Video not available', { status: 403 });

  const isGuest = payload.guest || !payload.userId || payload.userId === 'guest';
  let unlocked = false;
  if (!isGuest && payload.userId) {
    const unlock = await prisma.unlock.findFirst({ where: { userId: payload.userId, videoId: video.id } });
    unlocked = Boolean(unlock) || payload.userId === video.creatorId;
  }

  const hit = await cacheExists(video.r2Key);
  recordCacheHit(hit);

  const filePath = hit ? getCachePath(video.r2Key) : await ensureCached(video.r2Key);
  const rangeHeader = req.headers.get('range');
  let maxBytes: number | undefined = undefined;
  if (!unlocked && video.durationSec > 0) {
    const stat = await fsPromises.stat(filePath);
    const ratio = Math.min(video.teaserSec / video.durationSec, 1);
    maxBytes = Math.max(Math.floor(stat.size * ratio), Math.min(stat.size, 1024 * 512));
  }

  const result = await streamFile(filePath, rangeHeader, maxBytes);

  return new Response(Readable.toWeb(result.stream) as any, {
    status: result.status,
    headers: {
      ...result.headers,
      'Cache-Control': 'private, max-age=0, no-store'
    }
  });
}




