import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { createAuthToken } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

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




