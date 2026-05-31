import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { putObject } from '@/lib/bunny-storage';
import { buildOwnedUploadKey, validateUploadRequest } from '@/lib/upload-security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get('file');
  const purposeValue = formData?.get('purpose');
  const purpose = typeof purposeValue === 'string' ? purposeValue.trim() : '';

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Upload file is required.' }, { status: 400 });
  }

  if (purpose !== 'poster' && purpose !== 'trailer') {
    return NextResponse.json({ error: 'Only poster and trailer uploads are supported here.' }, { status: 400 });
  }

  const validation = validateUploadRequest({
    purpose,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    fileSize: file.size
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const key = buildOwnedUploadKey({
    userId: auth.sub,
    purpose,
    filename: file.name,
    assetId: uuid()
  });

  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(key, buffer, file.type || 'application/octet-stream');

  return NextResponse.json({ ok: true, key });
}
