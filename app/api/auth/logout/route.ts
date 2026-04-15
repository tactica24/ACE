import { NextRequest, NextResponse } from 'next/server';
import { clearAuthSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  return clearAuthSession(response, req);
}
