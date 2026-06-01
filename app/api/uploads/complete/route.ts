import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getCreatorLinkAuthFromRequest } from '@/lib/creator-access-links';
import { completeMultipartStorageUpload } from '@/lib/bunny-storage-s3';
import type { CompletedMultipartUploadPart } from '@/lib/storage-upload';

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

    const body = await req.json().catch(() => null);
    const key = typeof body?.key === 'string' ? body.key.trim() : '';
    const uploadId = typeof body?.uploadId === 'string' ? body.uploadId.trim() : '';
    const parts = Array.isArray(body?.parts)
      ? body.parts
          .map((part) => ({
            partNumber: Number(part?.partNumber ?? 0),
            etag: typeof part?.etag === 'string' ? part.etag.trim() : ''
          }))
          .filter((part) => part.partNumber > 0 && part.etag)
      : [];

    if (!key || !uploadId || !parts.length) {
      return NextResponse.json({ error: 'Multipart upload key, uploadId, and parts are required.' }, { status: 400 });
    }

    await completeMultipartStorageUpload({
      key,
      uploadId,
      parts: parts as CompletedMultipartUploadPart[]
    });

    return NextResponse.json({ ok: true, key });
  } catch (error) {
    console.error('[upload-complete] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to complete multipart upload.' },
      { status: 500 }
    );
  }
}
