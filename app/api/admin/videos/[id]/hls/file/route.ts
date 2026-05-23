import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getHlsAssetKey, getHlsContentType } from '@/lib/hls';
import { getHlsBucket, putObject } from '@/lib/r2';

export const runtime = 'nodejs';

function normalizePath(path: string) {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
}

function isUnsafePath(path: string) {
  return path.split('/').some((segment) => segment === '..') || path.startsWith('__MACOSX/');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  const rawRelativePath = form?.get('relativePath');
  const relativePath = normalizePath(typeof rawRelativePath === 'string' ? rawRelativePath.trim() : '');

  if (!(file instanceof File) || !relativePath || isUnsafePath(relativePath)) {
    return NextResponse.json({ error: 'A valid HLS file and relative path are required.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await putObject(getHlsAssetKey(params.id, relativePath), buffer, getHlsContentType(relativePath), getHlsBucket());

  return NextResponse.json({ ok: true, key: getHlsAssetKey(params.id, relativePath), relativePath });
}
