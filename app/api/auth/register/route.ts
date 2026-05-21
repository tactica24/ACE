import { NextRequest, NextResponse } from 'next/server';
import { applyAuthSession, getAuthServerConfigErrorMessage, syncAuthSession } from '@/lib/auth';
import { consumeRateLimit, getRateLimitIdentity } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rateLimit = await consumeRateLimit({
    key: `auth-register:${getRateLimitIdentity(req)}`,
    limit: 12,
    windowMs: 1000 * 60 * 10
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many registration attempts. Please wait a moment and try again.' }, { status: 429 });
  }

  const configError = getAuthServerConfigErrorMessage();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const body = await req.json();
  const { idToken, name, signupIntent } = body as {
    idToken?: string;
    name?: string;
    signupIntent?: 'VIEWER' | 'CREATOR';
  };
  const safeName = name?.trim();
  const safeSignupIntent = signupIntent === 'CREATOR' ? 'CREATOR' : 'VIEWER';

  if (!idToken || !safeName) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const { user, sessionCookie } = await syncAuthSession(idToken, {
      name: safeName,
      signupIntent: safeSignupIntent
    });
    const response = NextResponse.json({ ok: true, user });
    applyAuthSession(response, sessionCookie);
    return response;
  } catch (error) {
    console.error('Register route failed', error);
    const message = error instanceof Error ? error.message : 'Account creation failed.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
