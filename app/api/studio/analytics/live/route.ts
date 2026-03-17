import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function buildPayload(userId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const unlocks = await prisma.unlock.findMany({
    where: { video: { creatorId: userId } }
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

  return {
    unlocksToday,
    revenueToday,
    totalUnlocks: unlocks.length,
    totalRevenue,
    streamedAt: new Date().toISOString()
  };
}

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        const payload = await buildPayload(auth.sub);
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
