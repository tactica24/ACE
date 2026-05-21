import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  const movieId = typeof body.movieId === 'string' ? body.movieId.trim() : '';
  const progressSeconds = typeof body.progressSeconds === 'number' ? body.progressSeconds : 0;
  const completed = typeof body.completed === 'boolean' ? body.completed : false;

  if (!sessionId || !movieId) {
    return NextResponse.json({ error: 'sessionId and movieId required' }, { status: 400 });
  }

  const session = await prisma.playbackSession.findFirst({
    where: {
      id: sessionId,
      userId: auth.sub,
      videoId: movieId
    },
    include: {
      video: {
        select: { durationSec: true }
      }
    }
  });

  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 403 });
  }

  const safeProgressSeconds = Math.max(0, Math.floor(progressSeconds));
  const now = new Date();

  await prisma.$transaction([
    prisma.playbackSession.update({
      where: { id: sessionId },
      data: {
        progressSeconds: safeProgressSeconds,
        completed,
        lastProgressAt: now
      }
    }),
    prisma.watchHistory.upsert({
      where: {
        userId_videoId: {
          userId: auth.sub,
          videoId: movieId
        }
      },
      update: {
        progressSec: completed ? 0 : safeProgressSeconds,
        durationSec: session.video.durationSec,
        completedAt: completed ? now : null
      },
      create: {
        userId: auth.sub,
        videoId: movieId,
        progressSec: completed ? 0 : safeProgressSeconds,
        durationSec: session.video.durationSec,
        completedAt: completed ? now : null
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
