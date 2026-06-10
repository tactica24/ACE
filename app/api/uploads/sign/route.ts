import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { createPreparedStorageUpload, ensureMovieUploadFolders } from '@/lib/bunny-storage';
import { hasConfiguredBunnyStorageS3 } from '@/lib/bunny-storage-s3';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { buildOwnedUploadKey, isUploadPurpose, sanitizeUploadFolderId, validateUploadRequest } from '@/lib/upload-security';

async function getUploadAuth(req: NextRequest) {
  const [sessionAuth, uploadCreatorLinkAuth, shortUploadCreatorLinkAuth] = await Promise.all([
    getAuthFromRequest(req),
    getCreatorLinkAuthFromRequest(req, 'upload'),
    getCreatorLinkAuthFromRequest(req, 'short-upload')
  ]);
  const creatorLinkAuth = uploadCreatorLinkAuth ?? shortUploadCreatorLinkAuth;
  const auth =
    sessionAuth && (sessionAuth.role === 'CREATOR' || sessionAuth.role === 'ADMIN')
      ? sessionAuth
      : creatorLinkAuth ?? sessionAuth;

  return auth && (auth.role === 'CREATOR' || auth.role === 'ADMIN') ? auth : null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUploadAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await consumeRateLimit({
      key: `upload-sign:${getRateLimitIdentity(req, auth.sub)}`,
      limit: 80,
      windowMs: 1000 * 60 * 10
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many upload preparations right now. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
    const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
    const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
    const folderId = typeof body?.folderId === 'string' ? sanitizeUploadFolderId(body.folderId.trim()) : null;
    const fileSize = Number(body?.fileSize ?? 0);

    if (!filename || !contentType || !purpose) {
      return NextResponse.json(
        { error: 'Missing required file information: filename, contentType, and purpose are required.' },
        { status: 400 }
      );
    }

    if (!isUploadPurpose(purpose)) {
      return NextResponse.json({ error: 'Invalid upload purpose.' }, { status: 400 });
    }

    const validation = validateUploadRequest({ purpose, filename, contentType, fileSize });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (folderId) {
      try {
        await ensureMovieUploadFolders(auth.sub, folderId);
      } catch (error) {
        console.error('[upload-sign] folder preparation failed', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Bunny Storage folder preparation failed before upload could start.',
            stage: 'storage-folder-prep',
            directUploadConfigured: hasConfiguredBunnyStorageS3()
          },
          { status: 500 }
        );
      }
    }

    const key = buildOwnedUploadKey({
      userId: auth.sub,
      purpose,
      filename,
      assetId: uuid(),
      folderId
    });

    const forceSinglePartUpload =
      purpose === 'poster' || purpose === 'trailer' || purpose === 'subtitle';

    let upload;
    try {
      upload = await createPreparedStorageUpload(
        key,
        contentType,
        forceSinglePartUpload ? 0 : fileSize
      );
    } catch (error) {
      console.error('[upload-sign] direct upload preparation failed', error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Unable to prepare direct Bunny upload.',
          stage: 'direct-upload-preparation',
          directUploadConfigured: hasConfiguredBunnyStorageS3()
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...upload,
      purpose,
      diagnostics: {
        directUploadConfigured: hasConfiguredBunnyStorageS3(),
        hasProxyFallback: Boolean('fallbackUrl' in upload && upload.fallbackUrl),
        forceSinglePartUpload
      }
    });
  } catch (error) {
    console.error('[upload-sign] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to prepare upload. Please try again.' },
      { status: 500 }
    );
  }
}
