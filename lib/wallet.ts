import { Prisma } from '@prisma/client';
import { DEFAULT_TIER_PRICE_NAIRA, getDefaultTierPriceNaira } from './commerce';
import { prisma } from './db';
import { type PriceTierValue } from './media-types';

export const PRICE_MAP: Record<PriceTierValue, number> = DEFAULT_TIER_PRICE_NAIRA;

export function getPrice(tier: PriceTierValue) {
  return getDefaultTierPriceNaira(tier);
}

export function getCreatorShare(amountNaira: number) {
  return Math.round(amountNaira * 0.6);
}

export function getPlatformShare(amountNaira: number) {
  return Math.round(amountNaira * 0.4);
}

export async function debitWallet(userId: string, amount: number) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet-debit:${userId}`}))`;

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new Error('Wallet not found');
      if (wallet.balanceNaira < amount) throw new Error('Insufficient balance');
      return tx.wallet.update({
        where: { userId },
        data: { balanceNaira: { decrement: amount } }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function creditWallet(userId: string, amount: number) {
  return prisma.wallet.upsert({
    where: { userId },
    update: { balanceNaira: { increment: amount } },
    create: { userId, balanceNaira: amount }
  });
}
