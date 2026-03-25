import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (
    auth.role !== 'CREATOR' &&
    auth.role !== 'ADMIN' &&
    !(auth.signupIntent === 'CREATOR' && (auth.creatorAccessStatus === 'INVITED' || auth.creatorAccessStatus === 'SUBMITTED'))
  ) {
    return NextResponse.json({ error: 'Creator onboarding has not been unlocked for this account yet.' }, { status: 403 });
  }

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

  await prisma.user.update({
    where: { id: auth.sub },
    data: { role: 'CREATOR', signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED' }
  });

  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.sub },
    select: { creatorNumber: true }
  });
  const creatorNumber = existingProfile?.creatorNumber ?? (await generateUniqueCreatorNumber());

  const profile = await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: {
      creatorNumber,
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
      creatorNumber,
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
      creatorNumber: profile.creatorNumber,
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
