import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getAuthFromRequest } from '@/lib/auth';
import { createPresignedPutUrl } from '@/lib/r2';

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'Missing file info' }, { status: 400 });
  }

  const key = `uploads/${auth.sub}/${uuid()}-${sanitizeFilename(filename)}`;
  const url = await createPresignedPutUrl(key, contentType);

  return NextResponse.json({ url, key });
}
