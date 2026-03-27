import { prisma } from './db';

export async function getFinanceConfig() {
  return prisma.financeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
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
      snackGbpMinor: 99,
      standardGbpMinor: 149,
      premiereGbpMinor: 199,
      snackCadMinor: 199,
      standardCadMinor: 249,
      premiereCadMinor: 299,
      familyPassUsdMinor: 1000,
      familyPassGbpMinor: 800,
      familyPassCadMinor: 1300
    }
  });
}

export async function getPlatformWallet() {
  return prisma.platformWallet.upsert({
    where: { id: 'ace-platform' },
    update: {},
    create: {
      id: 'ace-platform',
      balanceNaira: 0
    }
  });
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
