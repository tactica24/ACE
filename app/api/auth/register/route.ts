import { NextResponse } from 'next/server';
import { applyAuthSession, getAuthServerConfigErrorMessage, syncAuthSession } from '@/lib/auth';

export async function POST(req: Request) {
  const configError = getAuthServerConfigErrorMessage();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const body = await req.json();
  const { idToken, name, phone, signupIntent } = body as {
    idToken?: string;
    name?: string;
    phone?: string;
    signupIntent?: 'VIEWER' | 'CREATOR';
  };
  const safeName = name?.trim();
  const safePhone = phone?.trim();
  const safeSignupIntent = signupIntent === 'CREATOR' ? 'CREATOR' : 'VIEWER';

  if (!idToken || !safeName || !safePhone) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const { user, sessionCookie } = await syncAuthSession(idToken, {
      name: safeName,
      phone: safePhone,
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
