import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || (auth.role !== 'CREATOR' && auth.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creator = await prisma.creatorProfile.findUnique({ where: { userId: auth.sub } });
  if (!creator) return NextResponse.json({ contracts: [] });

  const contracts = await prisma.contract.findMany({
    where: { creatorId: creator.id },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ contracts });
}
