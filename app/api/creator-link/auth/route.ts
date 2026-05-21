import { NextRequest, NextResponse } from 'next/server';
import { verifyCreatorAccessLinkToken } from '@/lib/creator-access-links';

const COOKIE_NAME = 'ace_creator_link';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  const redirectTo = req.nextUrl.searchParams.get('redirect')?.trim() || '/studio/upload';

  if (!token) {
    return NextResponse.redirect(new URL('/404', req.url));
  }

  const verified = verifyCreatorAccessLinkToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL('/404', req.url));
  }

  const response = NextResponse.redirect(new URL(redirectTo, req.url));
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });

  return response;
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete({
    name: COOKIE_NAME,
    path: '/'
  });
  response.cookies.delete({
    name: COOKIE_NAME,
    path: '/creator-link'
  });
  return response;
}
