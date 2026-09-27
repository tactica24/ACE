import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { normalizeContentWarnings, normalizeLanguageCodes, normalizeSubtitleTracks } from '@/lib/content-metadata';
import { getObjectBuffer, putObject } from '@/lib/bunny-storage';
import { srtToVtt, ensureVttFilename } from '@/lib/subtitle-convert';
import { buildOwnedUploadKey, getUploadFolderIdFromKey, isOwnedUploadKey, sanitizeUploadFilename } from '@/lib/upload-security';
import { assertUploadedObjectExists } from '@/lib/uploaded-assets';
import { v4 as uuid } from 'uuid';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { normalizeDropboxSourceUrl } from '@/lib/master-source';
import { logger } from '@/lib/logger';
import { isPriceTier, isRightsTier, isVideoType, isAgeRating, type AgeRatingValue, type VideoTypeValue } from '@/lib/studio-tiers';

type VideoStatusValue = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

// NOTE: Full route body restored from local working tree in follow-up if truncated.
export async function POST(req: NextRequest) {
  const [sessionAuth, creatorLinkAuth] = await Promise.all([
    getAuthFromRequest(req),
    getCreatorLinkAuthFromRequest(req, 'upload')
  ]);
  const auth =
    sessionAuth && (sessionAuth.role === 'CREATOR' || sessionAuth.role === 'ADMIN')
      ? sessionAuth
      : creatorLinkAuth ?? sessionAuth;
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const priceTier = body?.priceTier as string | undefined;
  const rightsTier = body?.rightsTier as string | undefined;

  if (!priceTier || !rightsTier || !isPriceTier(priceTier) || !isRightsTier(rightsTier)) {
    return NextResponse.json({ error: 'Invalid pricing or rights tier' }, { status: 400 });
  }

  // Preserve type narrowing for downstream use when full handler is restored
  const safeVideoType: VideoTypeValue = isVideoType(body?.videoType) ? body.videoType : 'FEATURE';
  const safeAgeRating: AgeRatingValue = isAgeRating(body?.ageRating) ? body.ageRating : 'ALL';

  logger.error({ route: '/api/studio/video', note: 'partial restore - re-push full handler' }, 'video route needs full body');
  return NextResponse.json(
    { error: 'Studio video handler is being restored. Retry shortly.', safeVideoType, safeAgeRating },
    { status: 503 },
  );
}
