import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/auth';
import { getObjectMetadata } from '@/lib/r2';
import { streamR2Object } from '@/lib/stream';
import { touchStreamSession } from '@/lib/stream-sessions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StreamPayload = {
  userId?: string;
  videoId: string;
  guest?: boolean;
  deviceSessionId?: string;
  fullAccess?: boolean;
  streamKey?: string;
  teaserSec?: number;
  durationSec?: number;
};

function getMaxPreviewBytes(totalBytes: number, payload: StreamPayload) {
  const durationSec = Math.max(payload.durationSec ?? 0, 1);
  const teaserSec = Math.max(payload.teaserSec ?? 0, 0);
  const ratio = Math.min(teaserSec / durationSec, 1);
  return Math.max(Math.floor(totalBytes * ratio), Math.min(totalBytes, 1024 * 512));
}

function getHeaders(baseHeaders: HeadersInit, fullAccess: boolean) {
  const headers = new Headers(baseHeaders);
  headers.set('Cache-Control', fullAccess ? 'private, max-age=0, no-store' : 'public, max-age=60, s-maxage=600');
  headers.set('Vary', 'Range');
  return headers;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 401 });

  let payload: StreamPayload;
  try {
    payload = verifyStreamToken(token) as StreamPayload;
  } catch {
    return new Response('Invalid token', { status: 401 });
  }

  if (payload.videoId !== params.id) return new Response('Token mismatch', { status: 403 });
  if (!payload.streamKey) return new Response('Movie file is missing', { status: 404 });

  const fullAccess = Boolean(payload.fullAccess);
  if (!payload.guest && payload.userId && payload.deviceSessionId) {
    await touchStreamSession({
      userId: payload.userId,
      deviceSessionId: payload.deviceSessionId,
      videoId: payload.videoId
    });
  }

  try {
    let maxBytes: number | undefined;
    if (!fullAccess && (payload.durationSec ?? 0) > 0) {
      const metadata = await getObjectMetadata(payload.streamKey);
      const totalBytes = typeof metadata.ContentLength === 'number' ? metadata.ContentLength : 0;
      maxBytes = getMaxPreviewBytes(totalBytes, payload);
    }

    const result = await streamR2Object(payload.streamKey, req.headers.get('range'), maxBytes);
    return new Response(Readable.toWeb(result.stream) as never, {
      status: result.status,
      headers: getHeaders(result.headers, fullAccess)
    });
  } catch (error) {
    console.error('[movie-stream] failed', {
      videoId: params.id,
      streamKey: payload.streamKey,
      error: error instanceof Error ? error.message : String(error)
    });
    return new Response('Movie file could not be loaded from storage.', { status: 502 });
  }
}
