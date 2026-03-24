import { NextResponse } from 'next/server';
import { clearAuthSession } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAuthSession(response);
}
