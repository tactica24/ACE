import { NextRequest, NextResponse } from 'next/server';
import { applyAuthSession, getAuthServerConfigErrorMessage, syncAuthSession } from '@/lib/auth';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await consumeRateLimit({
      key: `auth-login:${getRateLimitIdentity(req)}`,
      limit: 20,
      windowMs: 1000 * 60 * 10
    });
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a moment and try again.' }, { status: 429 });
    }

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
