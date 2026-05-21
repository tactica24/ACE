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

export async function usePassCredit(userId: string, creditsRequired = 1) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pass-credit:${userId}`}))`;

      const pass = await tx.subscriptionPass.findFirst({
        where: { userId, expiresAt: { gt: new Date() }, creditsRemaining: { gte: creditsRequired } },
        orderBy: { expiresAt: 'asc' }
      });
      if (!pass || pass.creditsRemaining < creditsRequired) return null;
      return tx.subscriptionPass.update({
        where: { id: pass.id },
        data: { creditsRemaining: { decrement: creditsRequired } }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function useWalletCredit(userId: string, creditsRequired = 1) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wallet-credit:${userId}`}))`;

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.credits < creditsRequired) return null;
      return tx.wallet.update({
        where: { userId },
        data: { credits: { decrement: creditsRequired } }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
