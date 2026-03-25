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
      taxPercent: 7.5
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
