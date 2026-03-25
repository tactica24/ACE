import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthFromRequest } from '@/lib/auth';

function isValidPercent(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const creatorSharePercent = Number(body.creatorSharePercent ?? 0);
  const platformSharePercent = Number(body.platformSharePercent ?? 0);
  const gatewayFeePercent = Number(body.gatewayFeePercent ?? 0);
  const taxPercent = Number(body.taxPercent ?? 0);

  if (![creatorSharePercent, platformSharePercent, gatewayFeePercent, taxPercent].every(isValidPercent)) {
    return NextResponse.json({ error: 'All percentages must be valid positive numbers.' }, { status: 400 });
  }

  const total = creatorSharePercent + platformSharePercent + gatewayFeePercent + taxPercent;
  if (total > 100) {
    return NextResponse.json({ error: 'Total split percentages cannot exceed 100%.' }, { status: 400 });
  }

  const config = await prisma.financeConfig.upsert({
    where: { id: 'default' },
    update: {
      creatorSharePercent,
      platformSharePercent,
      gatewayFeePercent,
      taxPercent
    },
    create: {
      id: 'default',
      creatorSharePercent,
      platformSharePercent,
      gatewayFeePercent,
      taxPercent
    }
  });

  return NextResponse.json({ ok: true, config });
}
