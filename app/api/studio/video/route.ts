import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { type RightsTierValue } from '@/lib/contracts';
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

// Re-export handler implementation from dedicated module to keep this entrypoint small.
export { handleStudioVideoPost as POST } from '@/lib/studio-video-post';
