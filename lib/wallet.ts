import { PriceTier } from '@prisma/client';
import { prisma } from './db';

export const PRICE_MAP: Record<PriceTier, number> = {
  SNACK: 100,
  STANDARD: 200,
  PREMIERE: 500
};

export function getPrice(tier: PriceTier) {
  return PRICE_MAP[tier];
}

export function getCreatorShare(amountNaira: number) {
  return Math.round(amountNaira * 0.6);
}

export function getPlatformShare(amountNaira: number) {
  return Math.round(amountNaira * 0.4);
}

export async function debitWallet(userId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new Error('Wallet not found');
    if (wallet.balanceNaira < amount) throw new Error('Insufficient balance');
    return tx.wallet.update({
      where: { userId },
      data: { balanceNaira: { decrement: amount } }
    });
  });
}

export async function creditWallet(userId: string, amount: number) {
  return prisma.wallet.update({
    where: { userId },
    data: { balanceNaira: { increment: amount } }
  });
}

export async function usePassCredit(userId: string) {
  return prisma.$transaction(async (tx) => {
    const pass = await tx.subscriptionPass.findFirst({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' }
    });
    if (!pass || pass.creditsRemaining <= 0) return null;
    return tx.subscriptionPass.update({
      where: { id: pass.id },
      data: { creditsRemaining: { decrement: 1 } }
    });
  });
}

export async function useWalletCredit(userId: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.credits <= 0) return null;
    return tx.wallet.update({
      where: { userId },
      data: { credits: { decrement: 1 } }
    });
  });
}


