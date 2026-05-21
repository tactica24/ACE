import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId) {
    return NextResponse.json({ error: 'Producer account is required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      creator: {
        select: {
          creatorNumber: true
        }
      }
    }
  });

  if (!user) {
    return NextResponse.json({ error: 'Producer account not found.' }, { status: 404 });
  }

  if (user.creator?.creatorNumber) {
    return NextResponse.json({ ok: true, creatorNumber: user.creator.creatorNumber });
  }

  const creatorNumber = await generateUniqueCreatorNumber();
  const displayName = user.name?.trim() || user.email;

  const profile = await prisma.creatorProfile.upsert({
    where: { userId },
    create: {
      userId,
      creatorNumber,
      displayName,
      emailVerified: true
    },
    update: {
      creatorNumber
    },
    select: {
      creatorNumber: true
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      signupIntent: 'CREATOR',
      creatorAccessStatus: 'SUBMITTED'
    }
  });

  return NextResponse.json({ ok: true, creatorNumber: profile.creatorNumber });
}
