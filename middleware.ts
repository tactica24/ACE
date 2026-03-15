import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from './lib/auth';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('ace_token')?.value;
  const url = req.nextUrl.clone();

  if (!token) {
    url.pathname = '/auth/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  try {
    const payload = verifyAuthToken(token);
    if (req.nextUrl.pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    if (req.nextUrl.pathname.startsWith('/studio') && payload.role !== 'CREATOR' && payload.role !== 'ADMIN') {
      url.pathname = '/studio/onboarding';
      return NextResponse.redirect(url);
    }
  } catch {
    url.pathname = '/auth/login';
    url.searchParams.set('next', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/studio/:path*', '/admin/:path*']
};
