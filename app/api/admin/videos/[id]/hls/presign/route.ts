import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getHlsBucket, createPresignedPutUrl } from '@/lib/r2';
import { getHlsContentType } from '@/lib/hls';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const relativePath = typeof body.relativePath === 'string' ? body.relativePath.trim() : '';

  if (!relativePath || relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid relative path' }, { status: 400 });
  }

  const finalKey = `movies/${params.id}/${relativePath}`;
  const contentType = getHlsContentType(relativePath);

  const url = await createPresignedPutUrl(finalKey, contentType, getHlsBucket());

  return NextResponse.json({ url, key: finalKey });
}
