export type PriceTierValue = 'SNACK' | 'STANDARD' | 'PREMIERE';
export type RightsTierValue = 'SHARED' | 'EXCLUSIVE';
export type VideoTypeValue = 'FEATURE' | 'SERIES' | 'SHORT' | 'SKIT' | 'DOCUMENTARY' | 'ADVERT';
export type AgeRatingValue = 'ALL' | 'PG13' | 'PG16' | 'PG18';

export const PRICE_TIERS: PriceTierValue[] = ['SNACK', 'STANDARD', 'PREMIERE'];
export const RIGHTS_TIERS: RightsTierValue[] = ['SHARED', 'EXCLUSIVE'];
export const VIDEO_TYPES: VideoTypeValue[] = ['FEATURE', 'SERIES', 'SHORT', 'SKIT', 'DOCUMENTARY', 'ADVERT'];
export const AGE_RATINGS: AgeRatingValue[] = ['ALL', 'PG13', 'PG16', 'PG18'];

export function isPriceTier(value: string | undefined): value is PriceTierValue {
  return Boolean(value && PRICE_TIERS.includes(value as PriceTierValue));
}

export function isRightsTier(value: string | undefined): value is RightsTierValue {
  return Boolean(value && RIGHTS_TIERS.includes(value as RightsTierValue));
}

export function isVideoType(value: string | undefined): value is VideoTypeValue {
  return Boolean(value && VIDEO_TYPES.includes(value as VideoTypeValue));
}

export function isAgeRating(value: string | undefined): value is AgeRatingValue {
  return Boolean(value && AGE_RATINGS.includes(value as AgeRatingValue));
}
