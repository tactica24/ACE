import { NextRequest, NextResponse } from 'next/server';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const idCardNumber = typeof body.idCardNumber === 'string' ? body.idCardNumber.trim() : '';
  const idCardUrl = typeof body.idCardUrl === 'string' ? body.idCardUrl.trim() : '';
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const bankAccountNumber = typeof body.bankAccountNumber === 'string' ? body.bankAccountNumber.trim() : '';

  if (!userId || !name) {
    return NextResponse.json({ error: 'Name and target account are required.' }, { status: 400 });
  }

  const creatorNumber = await generateUniqueCreatorNumber();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        signupIntent: 'CREATOR',
        creatorAccessStatus: 'SUBMITTED'
      }
    });

    const existing = await tx.creatorProfile.findUnique({ where: { userId } });

    if (existing) {
      await tx.creatorProfile.update({
        where: { userId },
        data: {
          displayName: name,
          address: address || null,
          ninNumber: idCardNumber || null,
          idCardNumber: idCardNumber || null,
          idCardUrl: idCardUrl || null,
          bankName: bankName || null,
          bankAccountName: name,
          bankAccountNumber: bankAccountNumber || null,
          verified: false,
          ninVerified: false,
          idVerified: false,
          bankVerified: false
        }
      });
    } else {
      await tx.creatorProfile.create({
        data: {
          userId,
          creatorNumber,
          displayName: name,
          address: address || null,
          emailVerified: true,
          ninNumber: idCardNumber || null,
          idCardNumber: idCardNumber || null,
          ninVerified: false,
          idCardUrl: idCardUrl || null,
          idVerified: false,
          bankName: bankName || null,
          bankAccountName: name,
          bankAccountNumber: bankAccountNumber || null,
          bankVerified: false,
          verified: false
        }
      });
    }
  });

  return NextResponse.json({ ok: true });
}
