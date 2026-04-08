import { type NextRequest } from 'next/server';
import { CREDIT_UNIT_VALUE_NAIRA } from './credits';
import { type PriceTierValue, type VideoTypeValue } from './media-types';
import { getChargeForNaira, getBasePriceNairaForTierFromConfig, type PricingConfigValues, type RegionalPrice } from './pricing';

type PricedVideo = {
  priceTier: PriceTierValue;
  videoType: VideoTypeValue | string;
  seriesId?: string | null;
};

export const SERIES_EPISODE_UNLOCK_NAIRA = CREDIT_UNIT_VALUE_NAIRA;

export function usesSeriesEpisodePricing(video: Pick<PricedVideo, 'videoType' | 'seriesId'>) {
  return video.videoType === 'SERIES';
}

export function getUnlockAmountNairaForVideo(video: PricedVideo, config: PricingConfigValues) {
  if (usesSeriesEpisodePricing(video)) {
    return SERIES_EPISODE_UNLOCK_NAIRA;
  }

  return getBasePriceNairaForTierFromConfig(config, video.priceTier);
}

export function getRegionalPriceForVideo(
  req: NextRequest | Headers,
  video: PricedVideo,
  config: PricingConfigValues
): RegionalPrice {
  const amountNaira = getUnlockAmountNairaForVideo(video, config);
  const charge = getChargeForNaira(req, amountNaira);

  return {
    currency: charge.currency,
    amountMinor: charge.amountMinor,
    amountNaira: charge.amountNaira,
    region: charge.region
  };
}
