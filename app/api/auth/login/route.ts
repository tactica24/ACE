import { NextResponse } from 'next/server';
import { createAuthToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { verifyPassword } from '@/lib/password';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };
    const safeEmail = email?.trim().toLowerCase();

    if (!safeEmail || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!env.JWT_SECRET) {
      return NextResponse.json({ error: 'Authentication is not configured yet.' }, { status: 500 });
    }

    const user = await prisma.user.findUnique({ where: { email: safeEmail } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

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
    console.error('Login route failed', error);
    return NextResponse.json(
      { error: 'Login failed. Check Vercel function logs for the login route.' },
      { status: 500 }
    );
  }
}
