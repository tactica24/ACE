import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';
import { createPresignedPutUrl } from '@/lib/r2';
import { buildOwnedUploadKey, isUploadPurpose, validateUploadRequest } from '@/lib/upload-security';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    key: `studio-upload-url:${getRateLimitIdentity(req, auth.sub)}`,
    limit: 40,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many upload preparations right now. Please wait a moment and try again.' }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  const purpose = typeof body?.purpose === 'string' ? body.purpose.trim() : '';
  const fileSize = Number(body?.fileSize ?? 0);

  if (!filename || !contentType || !isUploadPurpose(purpose)) {
    return NextResponse.json({ error: 'Missing file info' }, { status: 400 });
  }

  const validation = validateUploadRequest({ purpose, filename, contentType, fileSize });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const key = buildOwnedUploadKey({
    userId: auth.sub,
    purpose,
    filename,
    assetId: uuid()
  });
  const url = await createPresignedPutUrl(key, contentType);

  return NextResponse.json({ url, key, purpose });
}
