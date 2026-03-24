import { NextResponse } from 'next/server';
import { applyAuthSession, syncAuthSession } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { idToken, phone } = body as { idToken?: string; phone?: string };
  const safePhone = phone?.trim();

  if (!idToken || !safePhone) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const { user, sessionCookie } = await syncAuthSession(idToken, { phone: safePhone });
    const response = NextResponse.json({ ok: true, user });
    applyAuthSession(response, sessionCookie);
    return response;
  } catch (error) {
    console.error('Register route failed', error);
    const message = error instanceof Error ? error.message : 'Account creation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
