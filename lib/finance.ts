import { type FinanceConfig } from '@prisma/client';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from './db';

const FINANCE_CONFIG_ID = 'default';
const FINANCE_CONFIG_TAG = 'finance-config';
const PLATFORM_WALLET_ID = 'ace-platform';
const PLATFORM_WALLET_TAG = 'platform-wallet';

const DEFAULT_FINANCE_CONFIG: Omit<FinanceConfig, 'updatedAt'> = {
  id: FINANCE_CONFIG_ID,
  creatorSharePercent: 60,
  platformSharePercent: 29.5,
  gatewayFeePercent: 3,
  taxPercent: 7.5,
  snackNaira: 100,
  standardNaira: 200,
  premiereNaira: 500,
  snackUsdMinor: 149,
  standardUsdMinor: 199,
  premiereUsdMinor: 249,
  snackEurMinor: 129,
  standardEurMinor: 179,
  premiereEurMinor: 229,
  snackGbpMinor: 99,
  standardGbpMinor: 149,
  premiereGbpMinor: 199,
  snackCadMinor: 199,
  standardCadMinor: 249,
  premiereCadMinor: 299,
  familyPassUsdMinor: 1000,
  familyPassEurMinor: 900,
  familyPassGbpMinor: 800,
  familyPassCadMinor: 1300
};

const getCachedFinanceConfig = unstable_cache(
  () =>
    prisma.financeConfig.findUnique({
      where: { id: FINANCE_CONFIG_ID }
    }),
  [FINANCE_CONFIG_TAG],
  { revalidate: 300, tags: [FINANCE_CONFIG_TAG] }
);

const getCachedPlatformWallet = unstable_cache(
  () =>
    prisma.platformWallet.findUnique({
      where: { id: PLATFORM_WALLET_ID }
    }),
  [PLATFORM_WALLET_TAG],
  { revalidate: 60, tags: [PLATFORM_WALLET_TAG] }
);

export async function getFinanceConfig() {
  const config = await getCachedFinanceConfig();
  if (config) {
    return config;
  }

  return prisma.financeConfig.upsert({
    where: { id: FINANCE_CONFIG_ID },
    update: {},
    create: DEFAULT_FINANCE_CONFIG
  });
}

export async function getPlatformWallet() {
  const wallet = await getCachedPlatformWallet();
  if (wallet) {
    return wallet;
  }

  return prisma.platformWallet.upsert({
    where: { id: PLATFORM_WALLET_ID },
    update: {},
    create: {
      id: PLATFORM_WALLET_ID,
      balanceNaira: 0
    }
  });
}

export function revalidateFinanceConfig() {
  revalidateTag(FINANCE_CONFIG_TAG);
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/highlights');
  revalidatePath('/wallet');
  revalidatePath('/tv');
}

export function revalidatePlatformWallet() {
  revalidateTag(PLATFORM_WALLET_TAG);
}

export function calculateUnlockSplit(amountNaira: number, config: {
  creatorSharePercent: number;
  platformSharePercent: number;
  gatewayFeePercent: number;
  taxPercent: number;
}) {
  const creatorNaira = Math.round(amountNaira * (config.creatorSharePercent / 100));
  const platformNaira = Math.round(amountNaira * (config.platformSharePercent / 100));
  const gatewayFeeNaira = Math.round(amountNaira * (config.gatewayFeePercent / 100));
  const taxNaira = Math.round(amountNaira * (config.taxPercent / 100));

  return {
    creatorNaira,
    platformNaira,
    gatewayFeeNaira,
    taxNaira
  };
}
