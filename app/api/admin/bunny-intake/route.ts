import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PRIMARY_CATEGORY_OPTIONS, normalizeSelectedGenres } from '@/lib/video-taxonomy';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const producerId = typeof body.producerId === 'string' ? body.producerId.trim() : '';
  const existingVideoId = typeof body.existingVideoId === 'string' ? body.existingVideoId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General';
  const releaseYear = Number(body.releaseYear ?? 0);
  const teaserSec = Math.max(0, Number(body.teaserSec ?? 0) || 0);
  const tags = Array.isArray(body.tags) ? body.tags.map((value) => String(value).trim()).filter(Boolean) : [];
  const genres = normalizeSelectedGenres(
    Array.isArray(body.genres) ? body.genres.map((value) => String(value).trim()).filter(Boolean) : []
  );

  if (!producerId || !title || !description) {
    return NextResponse.json({ error: 'Producer, title, and synopsis are required.' }, { status: 400 });
  }

  if (!PRIMARY_CATEGORY_OPTIONS.includes(category as (typeof PRIMARY_CATEGORY_OPTIONS)[number])) {
    return NextResponse.json({ error: 'Choose a valid primary category.' }, { status: 400 });
  }

  const producer = await prisma.user.findUnique({
    where: { id: producerId },
    select: { id: true, email: true }
  });

  if (!producer) {
    return NextResponse.json({ error: 'Selected producer account was not found.' }, { status: 404 });
  }

  const safeReleaseYear = Number.isFinite(releaseYear) && releaseYear > 1800 ? Math.trunc(releaseYear) : null;

  const existingVideo =
    (existingVideoId
      ? await prisma.video.findFirst({
          where: {
            id: existingVideoId,
            creatorId: producer.id,
            status: { in: ['DRAFT', 'PROCESSING', 'READY'] }
          },
          select: { id: true }
        })
      : null) ??
    (await prisma.video.findFirst({
      where: {
        creatorId: producer.id,
        title,
        status: { in: ['DRAFT', 'PROCESSING', 'READY'] },
        videoType: 'FEATURE',
        seriesId: null
      },
      orderBy: { updatedAt: 'desc' },
      select: { id: true }
    }));

  const video = existingVideo
    ? await prisma.video.update({
        where: { id: existingVideo.id },
        data: {
          title,
          description,
          category,
          releaseYear: safeReleaseYear,
          teaserSec,
          genres,
          tags
        },
        select: {
          id: true,
          title: true,
          creatorId: true,
          status: true
        }
      })
    : await prisma.video.create({
        data: {
          creatorId: producer.id,
          title,
          description,
          category,
          releaseYear: safeReleaseYear,
          videoType: 'FEATURE',
          priceTier: 'STANDARD',
          rightsTier: 'SHARED',
          durationSec: 0,
          teaserSec,
          status: 'DRAFT',
          genres,
          tags,
          technicalMetadata: {
            create: {
              processingStatus: 'NO_MASTER'
            }
          }
        },
        select: {
          id: true,
          title: true,
          creatorId: true,
          status: true
        }
      });

  return NextResponse.json({
    ok: true,
    reusedExisting: Boolean(existingVideo),
    video
  });
}
