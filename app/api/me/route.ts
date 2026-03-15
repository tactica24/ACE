import { NextResponse, NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ user: null });
  return NextResponse.json({ user: auth });
}




