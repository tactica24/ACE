import { NextRequest, NextResponse } from 'next/server';
import { putObject, verifyStorageUploadToken } from '@/lib/bunny-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Missing upload token.' }, { status: 401 });
  }

  let payload: { key: string; contentType: string };
  try {
    payload = verifyStorageUploadToken(token);
  } catch {
    return NextResponse.json({ error: 'Invalid or expired upload token.' }, { status: 401 });
  }

  if (!payload.key || !req.body) {
    return NextResponse.json({ error: 'Missing upload body.' }, { status: 400 });
  }

  const contentType = req.headers.get('content-type') || payload.contentType || 'application/octet-stream';
  if (payload.contentType && contentType.split(';')[0] !== payload.contentType.split(';')[0]) {
    return NextResponse.json({ error: 'Upload content type does not match the prepared file.' }, { status: 400 });
  }

  try {
    await putObject(payload.key, req.body, contentType);
    return NextResponse.json({ ok: true, key: payload.key });
  } catch (error) {
    console.error('[bunny-upload] failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to upload to Bunny Storage.' },
      { status: 502 }
    );
  }
}
