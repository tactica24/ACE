import { NextResponse } from 'next/server';
import { createAuthToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { hashPassword } from '@/lib/password';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, phone, password } = body as { email?: string; phone?: string; password?: string };
  const safeEmail = email?.trim().toLowerCase();
  const safePhone = phone?.trim();

  if (!safeEmail || !safePhone || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    if (!env.JWT_SECRET) {
      return NextResponse.json({ error: 'Authentication is not configured yet.' }, { status: 500 });
    }

    const existing = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: safeEmail,
        phone: safePhone,
        passwordHash,
        wallet: { create: {} }
      }
    });

    const token = createAuthToken({ sub: user.id, role: user.role, email: user.email, phone: user.phone });
    const response = NextResponse.json({ ok: true, token });
    response.cookies.set('ace_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Register route failed', error);
    return NextResponse.json(
      { error: 'Account creation failed. Check Vercel function logs for the register route.' },
      { status: 500 }
    );
  }
}
