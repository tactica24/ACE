import { NextRequest, NextResponse } from 'next/server';
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE, getAuthFromRequest, hasVerifiedEmail } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasVerifiedEmail(auth)) {
    return NextResponse.json({ error: EMAIL_VERIFICATION_REQUIRED_MESSAGE }, { status: 403 });
  }

  return NextResponse.json(
    { error: 'Retired family checkout. Please share wallet balance instead.' },
    { status: 410 }
  );
}
