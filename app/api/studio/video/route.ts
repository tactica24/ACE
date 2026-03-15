import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { generateContract } from '@/lib/contracts';
import { RightsTier, PriceTier, VideoStatus, VideoType, AgeRating } from '@prisma/client';

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
    priceTier?: PriceTier;
    rightsTier?: RightsTier;
    teaserSec?: number;
    durationSec?: number;
    tags?: string[];
    highlightSeconds?: number[];
    r2Key?: string;
  };

  if (!title || !description || !priceTier || !rightsTier || !teaserSec || !durationSec || !r2Key) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

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
      videoType: (videoType as VideoType) ?? VideoType.FEATURE,
      ageRating: (ageRating as AgeRating) ?? AgeRating.ALL,
      category: category ?? 'General',
      genres: genres ?? [],
      priceTier,
      rightsTier,
      status: VideoStatus.PENDING,
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

  const payoutSplit = rightsTier === RightsTier.EXCLUSIVE ? creatorProfile.payoutSplitExclusive : creatorProfile.payoutSplitStandard;
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




