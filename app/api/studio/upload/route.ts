import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { putObject } from '@/lib/r2';

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Select a file to upload.' }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: 'Uploaded file is empty.' }, { status: 400 });
  }

  const safeFilename = sanitizeFilename(file.name || 'upload.bin');
  const contentType = file.type || 'application/octet-stream';
  const key = `uploads/${auth.sub}/${uuid()}-${safeFilename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await putObject(key, buffer, contentType);

  return NextResponse.json({ ok: true, key });
}
