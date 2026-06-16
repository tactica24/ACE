import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await prisma.wallet.findUnique({ where: { userId: auth.sub } });

  return NextResponse.json({
    balanceNaira: wallet?.balanceNaira ?? 0,
    balanceLabel: getRegionalMoneyDisplay(req, wallet?.balanceNaira ?? 0).label
  });
}
