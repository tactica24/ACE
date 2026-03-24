import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const unlocks = await prisma.unlock.findMany({
    where: { video: { creatorId: auth.sub } },
    include: { video: { select: { rightsTier: true } } }
  });

  let totalRevenue = 0;
  let revenueToday = 0;
  let unlocksToday = 0;

  for (const unlock of unlocks) {
    const creatorShare = Math.round(unlock.amountNaira * 0.6);
    totalRevenue += creatorShare;
    if (unlock.createdAt >= startOfDay) {
      revenueToday += creatorShare;
      unlocksToday += 1;
    }
  }

  return NextResponse.json({
    unlocksToday,
    revenueToday,
    totalUnlocks: unlocks.length,
    totalRevenue
  });
}

