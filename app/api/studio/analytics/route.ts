import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.sub },
    select: { id: true, earningsBalanceNaira: true }
  });

  if (!creatorProfile) {
    return NextResponse.json({
      unlocksToday: 0,
      revenueToday: 0,
      totalUnlocks: 0,
      totalRevenue: 0,
      walletBalance: 0
    });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const settlements = await prisma.unlockSettlement.findMany({
    where: { creatorProfileId: creatorProfile.id }
  });

  const totalRevenue = settlements.reduce((sum, settlement) => sum + settlement.creatorNaira, 0);
  const revenueToday = settlements
    .filter((settlement) => settlement.createdAt >= startOfDay)
    .reduce((sum, settlement) => sum + settlement.creatorNaira, 0);
  const unlocksToday = settlements.filter((settlement) => settlement.createdAt >= startOfDay).length;

  return NextResponse.json({
    unlocksToday,
    revenueToday,
    totalUnlocks: settlements.length,
    totalRevenue,
    walletBalance: creatorProfile.earningsBalanceNaira
  });
}
