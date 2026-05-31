import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { createStorageUploadUrl } from '@/lib/bunny-storage';

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const scope = body.scope === 'platform' ? 'platform' : 'producer';
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';

  if (scope === 'platform' && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Only admins can upload the ACE Studio signature.' }, { status: 403 });
  }

  if (!filename || contentType !== 'image/jpeg') {
    return NextResponse.json({ error: 'Upload a JPEG signature image.' }, { status: 400 });
  }

  const key = `contract-signatures/${scope}/${auth.sub}/${uuid()}-${sanitizeFilename(filename)}`;
  const url = await createStorageUploadUrl(key, contentType);

  return NextResponse.json({ ok: true, key, url });
}
