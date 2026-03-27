import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PRICE_TIERS = ['SNACK', 'STANDARD', 'PREMIERE'] as const;
const RIGHTS_TIERS = ['SHARED', 'EXCLUSIVE'] as const;
const VIDEO_TYPES = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'] as const;
const AGE_RATINGS = ['ALL', 'PG13', 'PG16', 'PG18'] as const;

function normalizeList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : 'General';
  const videoType = typeof body.videoType === 'string' ? body.videoType.trim() : 'FEATURE';
  const ageRating = typeof body.ageRating === 'string' ? body.ageRating.trim() : 'ALL';
  const priceTier = typeof body.priceTier === 'string' ? body.priceTier.trim() : 'STANDARD';
  const rightsTier = typeof body.rightsTier === 'string' ? body.rightsTier.trim() : 'SHARED';
  const originalLanguage = typeof body.originalLanguage === 'string' ? body.originalLanguage.trim().toLowerCase() : 'en';
  const genres = normalizeList(body.genres);
  const contentWarnings = normalizeList(body.contentWarnings);

  if (!videoId || !title || !description) {
    return NextResponse.json({ error: 'Title, description, and video id are required.' }, { status: 400 });
  }

  if (!PRICE_TIERS.includes(priceTier as (typeof PRICE_TIERS)[number])) {
    return NextResponse.json({ error: 'Invalid price tier.' }, { status: 400 });
  }
  if (!RIGHTS_TIERS.includes(rightsTier as (typeof RIGHTS_TIERS)[number])) {
    return NextResponse.json({ error: 'Invalid rights tier.' }, { status: 400 });
  }
  if (!VIDEO_TYPES.includes(videoType as (typeof VIDEO_TYPES)[number])) {
    return NextResponse.json({ error: 'Invalid video type.' }, { status: 400 });
  }
  if (!AGE_RATINGS.includes(ageRating as (typeof AGE_RATINGS)[number])) {
    return NextResponse.json({ error: 'Invalid age rating.' }, { status: 400 });
  }

  const video = await prisma.video.update({
    where: { id: videoId },
    data: {
      title,
      description,
      category,
      videoType: videoType as (typeof VIDEO_TYPES)[number],
      ageRating: ageRating as (typeof AGE_RATINGS)[number],
      priceTier: priceTier as (typeof PRICE_TIERS)[number],
      rightsTier: rightsTier as (typeof RIGHTS_TIERS)[number],
      originalLanguage,
      genres,
      contentWarnings
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      videoType: true,
      ageRating: true,
      priceTier: true,
      rightsTier: true,
      originalLanguage: true,
      genres: true,
      contentWarnings: true
    }
  });

  return NextResponse.json({ ok: true, video });
}
