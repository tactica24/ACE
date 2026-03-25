import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!userId) {
    return NextResponse.json({ error: 'A user is required for admin promotion.' }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true }
  });

  if (!existingUser) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  if (existingUser.role === 'ADMIN') {
    return NextResponse.json({ ok: true, user: existingUser });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'ADMIN' },
    select: { id: true, email: true, role: true }
  });

  return NextResponse.json({ ok: true, user });
}
