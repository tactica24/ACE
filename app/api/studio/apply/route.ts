import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';
import { generateUniqueCreatorNumber } from '@/lib/creator-number';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }
  if (
    auth.role !== 'ADMIN' &&
    !(auth.signupIntent === 'CREATOR' && auth.creatorAccessStatus === 'REQUESTED')
  ) {
    return NextResponse.json({ error: 'This creator onboarding form is not available for this account.' }, { status: 403 });
  }

  const body = await req.json();
  const displayName = auth.name?.trim() ?? '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const idCardNumber = typeof body.idCardNumber === 'string' ? body.idCardNumber.trim() : '';
  const idCardUrl = typeof body.idCardUrl === 'string' ? body.idCardUrl.trim() : '';
  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const bankAccountNumber = typeof body.bankAccountNumber === 'string' ? body.bankAccountNumber.trim() : '';
  const bankAccountName = displayName;

  if (!displayName) return NextResponse.json({ error: 'Complete your account name before creator onboarding.' }, { status: 400 });
  if (!address) return NextResponse.json({ error: 'Address is required.' }, { status: 400 });
  if (!idCardNumber) return NextResponse.json({ error: 'Government ID number is required.' }, { status: 400 });
  if (!idCardUrl) return NextResponse.json({ error: 'Upload your ID card image before submitting.' }, { status: 400 });
  if (!bankName) return NextResponse.json({ error: 'Bank name is required.' }, { status: 400 });
  if (!bankAccountNumber) return NextResponse.json({ error: 'Bank account number is required.' }, { status: 400 });

  await prisma.user.update({
    where: { id: auth.sub },
    data: { signupIntent: 'CREATOR', creatorAccessStatus: 'SUBMITTED' }
  });

  const existingProfile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.sub },
    select: { creatorNumber: true, phoneVerified: true, emailVerified: true }
  });
  const creatorNumber = existingProfile?.creatorNumber ?? (await generateUniqueCreatorNumber());
  const emailVerified = existingProfile?.emailVerified || Boolean(auth.emailVerified);
  const phoneVerified = existingProfile?.phoneVerified ?? false;

  const profile = await prisma.creatorProfile.upsert({
    where: { userId: auth.sub },
    update: {
      creatorNumber,
      displayName,
      address,
      phoneVerified,
      emailVerified,
      ninNumber: idCardNumber ?? null,
      idCardNumber: idCardNumber ?? null,
      ninVerified: false,
      idCardUrl: idCardUrl ?? null,
      idVerified: false,
      bankName: bankName ?? null,
      bankAccountName: bankAccountName ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankVerified: false,
      verified: false
    },
    create: {
      userId: auth.sub,
      creatorNumber,
      displayName,
      address,
      phoneVerified,
      emailVerified,
      ninNumber: idCardNumber ?? null,
      idCardNumber: idCardNumber ?? null,
      ninVerified: false,
      idCardUrl: idCardUrl ?? null,
      idVerified: false,
      bankName: bankName ?? null,
      bankAccountName: bankAccountName ?? null,
      bankAccountNumber: bankAccountNumber ?? null,
      bankVerified: false,
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
