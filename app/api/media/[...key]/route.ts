import { NextRequest, NextResponse } from 'next/server';
import { createPresignedGetUrl } from '@/lib/r2';

export async function GET(_req: NextRequest, { params }: { params: { key?: string[] } }) {
  const key = params.key?.join('/');
  if (!key) {
    return NextResponse.json({ error: 'Missing asset key' }, { status: 400 });
  }

  try {
    const url = await createPresignedGetUrl(key);
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: 'Asset not available' }, { status: 404 });
  }
}
