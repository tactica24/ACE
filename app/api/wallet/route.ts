import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await prisma.wallet.findUnique({ where: { userId: auth.sub } });
  const pass = await prisma.subscriptionPass.findFirst({
    where: { userId: auth.sub, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' }
  });

  return NextResponse.json({
    balanceNaira: wallet?.balanceNaira ?? 0,
    credits: wallet?.credits ?? 0,
    pass: pass ? { creditsRemaining: pass.creditsRemaining, expiresAt: pass.expiresAt } : null
  });
}
