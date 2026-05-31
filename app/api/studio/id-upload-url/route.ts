import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest, hasVerifiedEmail, EMAIL_VERIFICATION_REQUIRED_MESSAGE } from '@/lib/auth';
import { createStorageUploadUrl } from '@/lib/bunny-storage';

const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.role !== 'ADMIN' && !hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  const body = await req.json();
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  const requestedUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const targetUserId = auth.role === 'ADMIN' && requestedUserId ? requestedUserId : auth.sub;

  const hasAccess =
    auth.role === 'ADMIN' ||
    auth.role === 'CREATOR' ||
    (auth.signupIntent === 'CREATOR' &&
      (auth.creatorAccessStatus === 'REQUESTED' || auth.creatorAccessStatus === 'SUBMITTED'));

  if (!hasAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!filename || !contentType || !allowedContentTypes.has(contentType)) {
    return NextResponse.json({ error: 'Upload a JPG, PNG, WEBP, or PDF document.' }, { status: 400 });
  }

  const key = `creator-kyc/${targetUserId}/${uuid()}-${filename}`;
  const url = await createStorageUploadUrl(key, contentType);

  return NextResponse.json({ ok: true, url, key });
}
