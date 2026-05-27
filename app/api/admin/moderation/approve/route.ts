import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { revalidateApprovedCatalog } from '@/lib/catalog';
import { isSeriesContainer } from '@/lib/video-access';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const id = body.id as string | undefined;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const moderation = await prisma.moderationItem.findUnique({
    where: { id },
    include: {
      video: {
        select: {
          id: true,
          title: true,
          videoType: true,
          seriesId: true,
          r2Key: true,
          fallbackR2Key: true,
          technicalMetadata: {
            select: { masterKey: true }
          },
          episodes: {
            select: {
              id: true,
              title: true,
              videoType: true,
              seriesId: true,
              r2Key: true,
              fallbackR2Key: true,
              technicalMetadata: {
                select: { masterKey: true }
              }
            },
            orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }]
          }
        }
      }
    }
  });

  if (!moderation) {
    return NextResponse.json({ error: 'Moderation item not found.' }, { status: 404 });
  }

  const readinessTargets = isSeriesContainer(moderation.video)
    ? moderation.video.episodes
    : [moderation.video];

  if (!readinessTargets.length) {
    return NextResponse.json({
      error: 'This series cannot be approved yet because it has no uploaded episodes.'
    }, { status: 400 });
  }

  const readiness = readinessTargets.map((video) => {
    const hasR2Asset = !!(video.r2Key || video.fallbackR2Key);
    const hasMaster = !!video.technicalMetadata?.masterKey;
    return {
      video,
      ready: hasR2Asset || hasMaster
    };
  });

  const notReady = readiness.filter((entry) => !entry.ready);
  if (notReady.length) {
    const blockedTitles = notReady.map((entry) => entry.video.title || entry.video.id).join(', ');
    return NextResponse.json({
      error: `Approval is blocked until every viewer playback asset is ready. Missing ready playback for: ${blockedTitles}.`
    }, { status: 400 });
  }

  await prisma.moderationItem.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewerId: auth.sub,
      notes: reason || moderation.notes
    }
  });

  await prisma.$transaction([
    prisma.video.update({ where: { id: moderation.videoId }, data: { status: 'APPROVED' } }),
    prisma.video.updateMany({ where: { seriesId: moderation.videoId }, data: { status: 'APPROVED' } })
  ]);
  revalidateApprovedCatalog();

  return NextResponse.json({ ok: true });
}
