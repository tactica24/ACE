import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';

function toInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth || auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const config = await prisma.financeConfig.upsert({
    where: { id: 'default' },
    update: {
      snackNaira: toInt(body.snackNaira, 100),
      standardNaira: toInt(body.standardNaira, 200),
      premiereNaira: toInt(body.premiereNaira, 500),
      snackUsdMinor: toInt(body.snackUsdMinor, 149),
      standardUsdMinor: toInt(body.standardUsdMinor, 199),
      premiereUsdMinor: toInt(body.premiereUsdMinor, 249),
      snackGbpMinor: toInt(body.snackGbpMinor, 99),
      standardGbpMinor: toInt(body.standardGbpMinor, 149),
      premiereGbpMinor: toInt(body.premiereGbpMinor, 199),
      snackCadMinor: toInt(body.snackCadMinor, 199),
      standardCadMinor: toInt(body.standardCadMinor, 249),
      premiereCadMinor: toInt(body.premiereCadMinor, 299),
      familyPassUsdMinor: toInt(body.familyPassUsdMinor, 1000),
      familyPassGbpMinor: toInt(body.familyPassGbpMinor, 800),
      familyPassCadMinor: toInt(body.familyPassCadMinor, 1300)
    },
    create: {
      id: 'default',
      creatorSharePercent: 60,
      platformSharePercent: 29.5,
      gatewayFeePercent: 3,
      taxPercent: 7.5,
      snackNaira: toInt(body.snackNaira, 100),
      standardNaira: toInt(body.standardNaira, 200),
      premiereNaira: toInt(body.premiereNaira, 500),
      snackUsdMinor: toInt(body.snackUsdMinor, 149),
      standardUsdMinor: toInt(body.standardUsdMinor, 199),
      premiereUsdMinor: toInt(body.premiereUsdMinor, 249),
      snackGbpMinor: toInt(body.snackGbpMinor, 99),
      standardGbpMinor: toInt(body.standardGbpMinor, 149),
      premiereGbpMinor: toInt(body.premiereGbpMinor, 199),
      snackCadMinor: toInt(body.snackCadMinor, 199),
      standardCadMinor: toInt(body.standardCadMinor, 249),
      premiereCadMinor: toInt(body.premiereCadMinor, 299),
      familyPassUsdMinor: toInt(body.familyPassUsdMinor, 1000),
      familyPassGbpMinor: toInt(body.familyPassGbpMinor, 800),
      familyPassCadMinor: toInt(body.familyPassCadMinor, 1300)
    }
  });

  return NextResponse.json({ ok: true, config });
}
