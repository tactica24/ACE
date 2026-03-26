import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = await consumeRateLimit({
    key: `watch-history:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 180,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many playback sync events right now.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const videoId = typeof body?.videoId === 'string' ? body.videoId : '';
  const rawProgress = Number(body?.progressSec ?? 0);
  const rawDuration = Number(body?.durationSec ?? 0);
  const completed = Boolean(body?.completed);

  if (!videoId) {
    return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true }
  });

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const progressSec = Math.max(0, Math.floor(Number.isFinite(rawProgress) ? rawProgress : 0));
  const durationSec = rawDuration > 0 && Number.isFinite(rawDuration) ? Math.floor(rawDuration) : null;

  const history = await prisma.watchHistory.upsert({
    where: {
      userId_videoId: {
        userId: auth.sub,
        videoId
      }
    },
    update: {
      progressSec: completed ? 0 : progressSec,
      durationSec,
      completedAt: completed ? new Date() : null
    },
    create: {
      userId: auth.sub,
      videoId,
      progressSec: completed ? 0 : progressSec,
      durationSec,
      completedAt: completed ? new Date() : null
    }
  });

  return NextResponse.json({ ok: true, history });
}
