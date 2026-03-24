import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { createPresignedPutUrl } from '@/lib/r2';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const filename = body.filename as string | undefined;
  const contentType = body.contentType as string | undefined;
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'Missing file info' }, { status: 400 });
  }

  const key = `uploads/${auth.sub}/${uuid()}-${filename}`;
  const url = await createPresignedPutUrl(key, contentType);

  return NextResponse.json({ url, key });
}




