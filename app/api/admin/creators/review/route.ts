import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const userId = typeof body.userId === 'string' ? body.userId : '';

  if (!userId) {
    return NextResponse.json({ error: 'Creator account is required.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { creator: true }
  });

  if (!user || user.signupIntent !== 'CREATOR' || !user.creator) {
    return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
  }

  if (
    !user.name ||
    !user.creator.address ||
    !user.creator.ninNumber ||
    !user.creator.idCardNumber ||
    !user.creator.idCardUrl ||
    !user.creator.bankName ||
    !user.creator.bankAccountNumber
  ) {
    return NextResponse.json({ error: 'Complete the creator profile before approval.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        role: 'CREATOR',
        signupIntent: 'CREATOR',
        creatorAccessStatus: 'SUBMITTED'
      }
    }),
    prisma.creatorProfile.update({
      where: { userId },
      data: {
        displayName: user.name,
        bankAccountName: user.name,
        phoneVerified: true,
        emailVerified: true,
        ninVerified: true,
        idVerified: true,
        bankVerified: true,
        verified: true
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
