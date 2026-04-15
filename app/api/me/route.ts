import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  const response = NextResponse.json({ user: auth ?? null });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
