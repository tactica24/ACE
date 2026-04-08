import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { storedUnitsToCredits } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await prisma.wallet.findUnique({ where: { userId: auth.sub } });
  const passes = await prisma.subscriptionPass.findMany({
    where: { userId: auth.sub, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'asc' }
  });

  return NextResponse.json({
    balanceNaira: wallet?.balanceNaira ?? 0,
    credits: storedUnitsToCredits(wallet?.credits ?? 0),
    pass: passes.length
      ? {
          creditsRemaining: storedUnitsToCredits(passes.reduce((total, pass) => total + pass.creditsRemaining, 0)),
          expiresAt: passes[0]?.expiresAt ?? null
        }
      : null
  });
}
