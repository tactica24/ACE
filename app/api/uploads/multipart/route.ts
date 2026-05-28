import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  createPresignedUploadPartUrl
} from '@/lib/r2';
import { buildOwnedUploadKey, isOwnedUploadKey, isUploadPurpose, validateUploadRequest } from '@/lib/upload-security';
import { getMultipartUploadRateLimit, type MultipartUploadAction } from '@/lib/upload-rate-limit';

type MultipartAction = MultipartUploadAction;

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

function normalizeParts(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((part) => ({
      ETag: typeof part?.ETag === 'string' ? part.ETag : '',
      PartNumber: Number(part?.PartNumber)
    }))
    .filter((part) => part.ETag && Number.isInteger(part.PartNumber) && part.PartNumber > 0)
    .sort((a, b) => a.PartNumber - b.PartNumber);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUploadAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const action = typeof body?.action === 'string' ? body.action.trim() as MultipartAction : null;
    const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId.trim() : '';

    if (!action || !['initiate', 'part', 'complete', 'abort'].includes(action)) {
      return NextResponse.json({ error: 'Invalid multipart upload action.' }, { status: 400 });
    }

    if (!isUploadPurpose(purpose)) {
      return NextResponse.json({ error: 'Invalid upload purpose.' }, { status: 400 });
    }

    const rateLimit = await consumeRateLimit(getMultipartUploadRateLimit(action, getRateLimitIdentity(req, auth.sub)));
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many upload requests right now. Please wait and try again.' }, { status: 429 });
    }

    if (action === 'initiate') {
      const filename = typeof body?.filename === 'string' ? body.filename.trim() : '';
      const contentType = typeof body?.contentType === 'string' ? body.contentType.trim() : '';
      const fileSize = Number(body?.fileSize ?? 0);
      const validation = validateUploadRequest({ purpose, filename, contentType, fileSize });
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const nextKey = buildOwnedUploadKey({ userId: auth.sub, purpose, filename, assetId: uuid() });
      const nextUploadId = await createMultipartUpload(nextKey, contentType);
      return NextResponse.json({ key: nextKey, uploadId: nextUploadId, purpose, contentType });
    }

    if (!key || !uploadId || !isOwnedUploadKey(key, auth.sub, purpose)) {
      return NextResponse.json({ error: 'Invalid multipart upload session.' }, { status: 400 });
    }

    if (action === 'part') {
      const partNumber = Number(body?.partNumber);
      if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
        return NextResponse.json({ error: 'Invalid upload part number.' }, { status: 400 });
      }

      const url = await createPresignedUploadPartUrl({ key, uploadId, partNumber });
      return NextResponse.json({ url, partNumber });
    }

    if (action === 'complete') {
      const parts = normalizeParts(body?.parts);
      if (!parts.length) {
        return NextResponse.json({ error: 'No uploaded parts were provided.' }, { status: 400 });
      }

      await completeMultipartUpload({ key, uploadId, parts });
      return NextResponse.json({ ok: true, key });
    }

    await abortMultipartUpload(key, uploadId).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[upload-multipart] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to complete multipart upload.' },
      { status: 500 }
    );
  }
}
