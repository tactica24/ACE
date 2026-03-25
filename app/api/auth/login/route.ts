import { NextResponse } from 'next/server';
import { applyAuthSession, getAuthServerConfigErrorMessage, syncAuthSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const configError = getAuthServerConfigErrorMessage();
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const body = await req.json();
    const { idToken } = body as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: 'Missing Firebase ID token' }, { status: 400 });
    }

    const { user, sessionCookie } = await syncAuthSession(idToken);
    const response = NextResponse.json({ ok: true, user });
    applyAuthSession(response, sessionCookie);
    return response;
  } catch (error) {
    console.error('Login route failed', error);
    const message = error instanceof Error ? error.message : 'Login failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
