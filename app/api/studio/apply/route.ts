import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const displayName = body.displayName as string | undefined;
  const bio = body.bio as string | undefined;
  const ninNumber = body.ninNumber as string | undefined;
  const idCardUrl = body.idCardUrl as string | undefined;
  const bankName = body.bankName as string | undefined;
  const bankAccountName = body.bankAccountName as string | undefined;
  const bankAccountNumber = body.bankAccountNumber as string | undefined;
  const reliabilityNotes = body.reliabilityNotes as string | undefined;

  if (!displayName) return NextResponse.json({ error: 'Missing display name' }, { status: 400 });

  await prisma.user.update({ where: { id: auth.sub }, data: { role: 'CREATOR' } });
  const profile = await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: {
      displayName,
      bio: bio ?? null,
      phoneVerified: Boolean(auth.phone),
      emailVerified: Boolean(auth.email),
      ninNumber: ninNumber ?? null,
      ninVerified: false,
      idCardUrl: idCardUrl ?? null,
      idVerified: false,
      bankName: bankName ?? null,
      bankAccountName: bankAccountName ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankVerified: false,
      reliabilityNotes: reliabilityNotes ?? null,
      verified: false
    },
    create: {
      userId: auth.sub,
      displayName,
      bio: bio ?? null,
      phoneVerified: Boolean(auth.phone),
      emailVerified: Boolean(auth.email),
      ninNumber: ninNumber ?? null,
      ninVerified: false,
      idCardUrl: idCardUrl ?? null,
      idVerified: false,
      bankName: bankName ?? null,
      bankAccountName: bankAccountName ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankVerified: false,
      reliabilityNotes: reliabilityNotes ?? null,
      verified: false
    }
  });

  return NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      emailVerified: profile.emailVerified,
      phoneVerified: profile.phoneVerified,
      ninVerified: profile.ninVerified,
      idVerified: profile.idVerified,
      bankVerified: profile.bankVerified,
      verified: profile.verified
    }
  });
}
