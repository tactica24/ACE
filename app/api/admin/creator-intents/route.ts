import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

const validStatuses = new Set(['REQUESTED', 'INVITED', 'SUBMITTED']);

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const creatorAccessStatus = typeof body.creatorAccessStatus === 'string' ? body.creatorAccessStatus : '';

  if (!userId || !validStatuses.has(creatorAccessStatus)) {
    return NextResponse.json({ error: 'Invalid creator access update.' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      signupIntent: 'CREATOR',
      creatorAccessStatus
    },
    select: {
      id: true,
      creatorAccessStatus: true
    }
  });

  return NextResponse.json({ ok: true, user });
}
