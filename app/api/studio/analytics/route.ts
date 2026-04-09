import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

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

  const revenueTodayDisplay = getRegionalMoneyDisplay(req, 0);
  const totalRevenueDisplay = getRegionalMoneyDisplay(req, 0);
  const walletBalanceDisplay = getRegionalMoneyDisplay(req, 0);

  if (!creatorProfile) {
    return NextResponse.json({
      unlocksToday: 0,
      revenueTodayLabel: revenueTodayDisplay.label,
      totalUnlocks: 0,
      totalRevenueLabel: totalRevenueDisplay.label,
      walletBalanceLabel: walletBalanceDisplay.label
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
  const revenueTodayLabel = getRegionalMoneyDisplay(req, revenueToday).label;
  const totalRevenueLabel = getRegionalMoneyDisplay(req, totalRevenue).label;
  const walletBalanceLabel = getRegionalMoneyDisplay(req, creatorProfile.earningsBalanceNaira).label;

  return NextResponse.json({
    unlocksToday,
    revenueTodayLabel,
    totalUnlocks: settlements.length,
    totalRevenueLabel,
    walletBalanceLabel
  });
}
