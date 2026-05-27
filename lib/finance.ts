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
  snackNaira: 50,
  standardNaira: 50,
  premiereNaira: 50,
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

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getFinanceConfig() {
  const fallback = {
    ...DEFAULT_FINANCE_CONFIG,
    updatedAt: new Date(0)
  };

  if (!hasDatabaseUrl()) {
    return fallback;
  }

  const config = await getCachedFinanceConfig().catch(() => null);
  if (config) {
    return config;
  }

  return prisma.financeConfig.upsert({
    where: { id: FINANCE_CONFIG_ID },
    update: {},
    create: DEFAULT_FINANCE_CONFIG
  }).catch(() => fallback);
}

export async function getPlatformWallet() {
  if (!hasDatabaseUrl()) {
    return {
      id: PLATFORM_WALLET_ID,
      balanceNaira: 0,
      updatedAt: new Date(0)
    };
  }

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
}, overrides?: {
  creatorSharePercent?: number | null;
  platformSharePercent?: number | null;
  taxPercent?: number | null;
}) {
  const hasMovieSplit =
    typeof overrides?.creatorSharePercent === 'number' &&
    typeof overrides?.platformSharePercent === 'number' &&
    typeof overrides?.taxPercent === 'number';
  const creatorSharePercent = hasMovieSplit ? overrides.creatorSharePercent! : config.creatorSharePercent;
  const platformSharePercent = hasMovieSplit ? overrides.platformSharePercent! : config.platformSharePercent;
  const gatewayFeePercent = hasMovieSplit ? 0 : config.gatewayFeePercent;
  const taxPercent = hasMovieSplit ? overrides.taxPercent! : config.taxPercent;

  const creatorNaira = Math.round(amountNaira * (creatorSharePercent / 100));
  const platformNaira = Math.round(amountNaira * (platformSharePercent / 100));
  const gatewayFeeNaira = Math.round(amountNaira * (gatewayFeePercent / 100));
  const taxNaira = hasMovieSplit
    ? Math.max(amountNaira - creatorNaira - platformNaira - gatewayFeeNaira, 0)
    : Math.round(amountNaira * (taxPercent / 100));

  return {
    creatorNaira,
    platformNaira,
    gatewayFeeNaira,
    taxNaira
  };
}
