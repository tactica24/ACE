import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { generateContract, type RightsTierValue } from '@/lib/contracts';

type PriceTierValue = 'SNACK' | 'STANDARD' | 'PREMIERE';
type VideoStatusValue = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
type VideoTypeValue = 'FEATURE' | 'SERIES' | 'SHORT' | 'SKIT' | 'DOCUMENTARY' | 'ADVERT';
type AgeRatingValue = 'ALL' | 'PG13' | 'PG16' | 'PG18';

const PRICE_TIERS: PriceTierValue[] = ['SNACK', 'STANDARD', 'PREMIERE'];
const RIGHTS_TIERS: RightsTierValue[] = ['SHARED', 'EXCLUSIVE'];
const VIDEO_TYPES: VideoTypeValue[] = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'];
const AGE_RATINGS: AgeRatingValue[] = ['ALL', 'PG13', 'PG16', 'PG18'];

function isPriceTier(value: string | undefined): value is PriceTierValue {
  return Boolean(value && PRICE_TIERS.includes(value as PriceTierValue));
}

function isRightsTier(value: string | undefined): value is RightsTierValue {
  return Boolean(value && RIGHTS_TIERS.includes(value as RightsTierValue));
}

function isVideoType(value: string | undefined): value is VideoTypeValue {
  return Boolean(value && VIDEO_TYPES.includes(value as VideoTypeValue));
}

function isAgeRating(value: string | undefined): value is AgeRatingValue {
  return Boolean(value && AGE_RATINGS.includes(value as AgeRatingValue));
}

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, videoType, ageRating, category, genres, priceTier, rightsTier, teaserSec, durationSec, tags, highlightSeconds, r2Key } = body as {
    title?: string;
    description?: string;
    videoType?: string;
    ageRating?: string;
    category?: string;
    genres?: string[];
    priceTier?: string;
    rightsTier?: string;
    teaserSec?: number;
    durationSec?: number;
    tags?: string[];
    highlightSeconds?: number[];
    r2Key?: string;
  };

  if (!title || !description || !priceTier || !rightsTier || !teaserSec || !durationSec || !r2Key) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (!isPriceTier(priceTier) || !isRightsTier(rightsTier)) {
    return NextResponse.json({ error: 'Invalid pricing or rights tier' }, { status: 400 });
  }

  const safeVideoType: VideoTypeValue = isVideoType(videoType) ? videoType : 'FEATURE';
  const safeAgeRating: AgeRatingValue = isAgeRating(ageRating) ? ageRating : 'ALL';
  const pendingStatus: VideoStatusValue = 'PENDING';

  const creatorProfile = await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: {},
    create: {
      userId: auth.sub,
      displayName: auth.email.split('@')[0]
    }
  });

  const video = await prisma.video.create({
    data: {
      creatorId: auth.sub,
      title,
      description,
      videoType: safeVideoType,
      ageRating: safeAgeRating,
      category: category ?? 'General',
      genres: genres ?? [],
      priceTier,
      rightsTier,
      status: pendingStatus,
      teaserSec,
      durationSec,
      tags: tags ?? [],
      highlightSeconds: highlightSeconds ?? [],
      r2Key
    }
  });

  await prisma.moderationItem.create({
    data: {
      videoId: video.id,
      status: 'PENDING'
    }
  });

  const payoutSplit = rightsTier === 'EXCLUSIVE' ? creatorProfile.payoutSplitExclusive : creatorProfile.payoutSplitStandard;
  const contractText = generateContract({
    creatorName: creatorProfile.displayName,
    videoTitle: video.title,
    rightsTier,
    payoutSplit
  });

  await prisma.contract.create({
    data: {
      creatorId: creatorProfile.id,
      videoId: video.id,
      rightsTier,
      contractText
    }
  });

  return NextResponse.json({ ok: true, videoId: video.id });
}
