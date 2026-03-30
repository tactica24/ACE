import { type PriceTierValue } from './media-types';

export const PASS_PRICE_NAIRA = 2500;
export const PASS_CREDITS = 30;
export const DEFAULT_FAMILY_BUNDLE_CREDITS = PASS_CREDITS;

export const DEFAULT_TIER_PRICE_NAIRA: Record<PriceTierValue, number> = {
  SNACK: 100,
  STANDARD: 200,
  PREMIERE: 500
};

export function getDefaultTierPriceNaira(tier: PriceTierValue) {
  return DEFAULT_TIER_PRICE_NAIRA[tier];
}
