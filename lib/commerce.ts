import { type PriceTierValue } from './media-types';

export const DEFAULT_TIER_PRICE_NAIRA: Record<PriceTierValue, number> = {
  SNACK: 50,
  STANDARD: 50,
  PREMIERE: 50
};

export function getDefaultTierPriceNaira(tier: PriceTierValue) {
  return DEFAULT_TIER_PRICE_NAIRA[tier];
}
