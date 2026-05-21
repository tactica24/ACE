import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function buildPayload(req: NextRequest, userId: string) {
  const creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true, earningsBalanceNaira: true }
  });

  if (!creatorProfile) {
    return {
      unlocksToday: 0,
      revenueTodayLabel: getRegionalMoneyDisplay(req, 0).label,
      totalUnlocks: 0,
      totalRevenueLabel: getRegionalMoneyDisplay(req, 0).label,
      walletBalanceLabel: getRegionalMoneyDisplay(req, 0).label,
      streamedAt: new Date().toISOString()
    };
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

  return {
    unlocksToday,
    revenueTodayLabel: getRegionalMoneyDisplay(req, revenueToday).label,
    totalUnlocks: settlements.length,
    totalRevenueLabel: getRegionalMoneyDisplay(req, totalRevenue).label,
    walletBalanceLabel: getRegionalMoneyDisplay(req, creatorProfile.earningsBalanceNaira).label,
    streamedAt: new Date().toISOString()
  };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        const payload = await buildPayload(req, auth.sub);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      await send();
      const interval = setInterval(() => {
        send().catch(() => {
          clearInterval(interval);
          if (!closed) controller.close();
        });
      }, 5000);

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
