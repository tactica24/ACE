import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { createAuthToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, phone, password } = body as { email?: string; phone?: string; password?: string };

  if (!email || !phone || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      phone,
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
}




