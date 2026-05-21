import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const runtime = 'nodejs';

const fields = ['emailVerified', 'ninVerified', 'idVerified', 'bankVerified'] as const;
type Field = (typeof fields)[number];

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const userId = body.userId as string | undefined;
  const field = body.field as Field | undefined;
  const value = Boolean(body.value);

  if (!userId || !field || !fields.includes(field)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const profile = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!profile) return NextResponse.json({ error: 'Producer profile not found' }, { status: 404 });

  const nextState = {
    emailVerified: field === 'emailVerified' ? value : profile.emailVerified,
    ninVerified: field === 'ninVerified' ? value : profile.ninVerified,
    idVerified: field === 'idVerified' ? value : profile.idVerified,
    bankVerified: field === 'bankVerified' ? value : profile.bankVerified
  };

  const updated = await prisma.creatorProfile.update({
    where: { userId },
    data: {
      [field]: value,
      verified: nextState.emailVerified && nextState.ninVerified && nextState.idVerified && nextState.bankVerified
    }
  });

  return NextResponse.json({
    ok: true,
    creator: {
      userId: updated.userId,
      emailVerified: updated.emailVerified,
      ninVerified: updated.ninVerified,
      idVerified: updated.idVerified,
      bankVerified: updated.bankVerified,
      verified: updated.verified
    }
  });
}
