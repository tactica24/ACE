import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const referral = await prisma.referralLink.findUnique({ where: { code: params.code } });

  const nextUrl = new URL(req.nextUrl);
  const fallback = '/browse';
  let destination = nextUrl.searchParams.get('to') || fallback;

  if (referral && referral.targetVideoId) {
    destination = `/v/${referral.targetVideoId}`;
  }

  const response = NextResponse.redirect(new URL(destination, req.nextUrl.origin));
  if (referral && (!referral.expiresAt || referral.expiresAt > new Date())) {
    response.cookies.set('ace_ref', referral.code, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    });
  }

  return response;
}

