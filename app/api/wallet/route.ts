import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { DEFAULT_FAMILY_BUNDLE_CREDITS, PASS_CREDITS, PASS_PRICE_NAIRA } from '@/lib/commerce';
import { storedUnitsToCredits } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { getFinanceConfig } from '@/lib/finance';
import { formatRecordedCharge } from '@/lib/format';
import { getChargeForNaira, getFamilyPassPriceFromConfig, getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const wallet = await prisma.wallet.findUnique({ where: { userId: auth.sub } });
  const passes = await prisma.subscriptionPass.findMany({
    where: { userId: auth.sub, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'asc' }
  });
  const financeConfig = await getFinanceConfig();
  const passCharge = getChargeForNaira(req, PASS_PRICE_NAIRA);
  const familyCharge = getFamilyPassPriceFromConfig(req, financeConfig);

  return NextResponse.json({
    balanceNaira: wallet?.balanceNaira ?? 0,
    balanceLabel: getRegionalMoneyDisplay(req, wallet?.balanceNaira ?? 0).label,
    credits: storedUnitsToCredits(wallet?.credits ?? 0),
    passPriceLabel: formatRecordedCharge({
      amountMinor: passCharge.amountMinor,
      amountNaira: PASS_PRICE_NAIRA,
      currency: passCharge.currency
    }),
    passCredits: PASS_CREDITS,
    familyBundlePriceLabel: formatRecordedCharge({
      amountMinor: familyCharge.amountMinor,
      amountNaira: familyCharge.amountNaira,
      currency: familyCharge.currency
    }),
    familyBundleCredits: Number(process.env.ACE_FAMILY_PASS_CREDITS ?? DEFAULT_FAMILY_BUNDLE_CREDITS),
    pass: passes.length
      ? {
          creditsRemaining: storedUnitsToCredits(passes.reduce((total, pass) => total + pass.creditsRemaining, 0)),
          expiresAt: passes[0]?.expiresAt ?? null
        }
      : null
  });
}
