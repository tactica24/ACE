import { NextRequest } from 'next/server';
import { getDefaultTierPriceNaira } from './commerce';
import { alignNairaToCreditValue } from './credits';
import { getGeoContext, getGeoContextFromHeaders } from './geo';
import { env } from './env';
import { getFinanceConfig } from './finance';
import { type PriceTierValue } from './media-types';

export type RegionalPrice = {
  currency: string;
  amountMinor: number;
  amountNaira: number;
  region: 'NG' | 'DIASPORA';
};

export type RegionalCurrency = {
  currency: string;
  region: 'NG' | 'DIASPORA';
};

export type PricingConfigValues = Awaited<ReturnType<typeof getFinanceConfig>>;

const EURO_REGIONS = new Set([
  'AT',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK'
]);

function getAmountMinorForTier(
  config: PricingConfigValues,
  tier: PriceTierValue,
  currency: 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD'
) {
  if (currency === 'NGN') {
    if (tier === 'SNACK') return config.snackNaira * 100;
    if (tier === 'STANDARD') return config.standardNaira * 100;
    return config.premiereNaira * 100;
  }

  if (currency === 'USD') {
    if (tier === 'SNACK') return config.snackUsdMinor;
    if (tier === 'STANDARD') return config.standardUsdMinor;
    return config.premiereUsdMinor;
  }

  if (currency === 'EUR') {
    if (tier === 'SNACK') return config.snackEurMinor;
    if (tier === 'STANDARD') return config.standardEurMinor;
    return config.premiereEurMinor;
  }

  if (currency === 'GBP') {
    if (tier === 'SNACK') return config.snackGbpMinor;
    if (tier === 'STANDARD') return config.standardGbpMinor;
    return config.premiereGbpMinor;
  }

  if (tier === 'SNACK') return config.snackCadMinor;
  if (tier === 'STANDARD') return config.standardCadMinor;
  return config.premiereCadMinor;
}

export function getBasePriceNairaForTierFromConfig(config: PricingConfigValues, tier: PriceTierValue) {
  if (tier === 'SNACK') return alignNairaToCreditValue(config.snackNaira ?? getDefaultTierPriceNaira('SNACK'));
  if (tier === 'STANDARD') return alignNairaToCreditValue(config.standardNaira ?? getDefaultTierPriceNaira('STANDARD'));
  return alignNairaToCreditValue(config.premiereNaira ?? getDefaultTierPriceNaira('PREMIERE'));
}

function getFamilyPassMinor(config: PricingConfigValues, currency: 'USD' | 'EUR' | 'GBP' | 'CAD') {
  if (currency === 'EUR') return config.familyPassEurMinor;
  if (currency === 'GBP') return config.familyPassGbpMinor;
  if (currency === 'CAD') return config.familyPassCadMinor;
  return config.familyPassUsdMinor;
}

export function getFxRate(currency: string) {
  if (currency === 'USD') return Number(env.ACE_USD_NGN_RATE ?? 1600);
  if (currency === 'EUR') return Number(env.ACE_EUR_NGN_RATE ?? 1750);
  if (currency === 'GBP') return Number(env.ACE_GBP_NGN_RATE ?? 2000);
  if (currency === 'CAD') return Number(env.ACE_CAD_NGN_RATE ?? 1200);
  return 1;
}

export function getRegionalCurrency(req: NextRequest | Headers): RegionalCurrency {
  const { country } = req instanceof Headers ? getGeoContextFromHeaders(req) : getGeoContext(req);
  if (!country || country === 'NG') {
    return { currency: 'NGN', region: 'NG' };
  }
  if (country === 'GB') return { currency: 'GBP', region: 'DIASPORA' };
  if (country === 'CA') return { currency: 'CAD', region: 'DIASPORA' };
  if (EURO_REGIONS.has(country)) return { currency: 'EUR', region: 'DIASPORA' };
  return { currency: 'USD', region: 'DIASPORA' };
}

export function getChargeForNaira(req: NextRequest | Headers, amountNaira: number) {
  const { currency, region } = getRegionalCurrency(req);
  if (currency === 'NGN') {
    return { currency, region, amountMinor: amountNaira * 100, amountNaira };
  }
  const rate = getFxRate(currency);
  const amountMinor = Math.max(1, Math.round((amountNaira / rate) * 100));
  return { currency, region, amountMinor, amountNaira };
}

export function getRegionalPriceFromConfig(
  req: NextRequest | Headers,
  tier: PriceTierValue,
  config: PricingConfigValues
): RegionalPrice {
  const { currency, region } = getRegionalCurrency(req);
  const amountMinor = getAmountMinorForTier(config, tier, currency as 'NGN' | 'USD' | 'EUR' | 'GBP' | 'CAD');
  const amountNaira = getBasePriceNairaForTierFromConfig(config, tier);

  return {
    currency,
    amountMinor,
    amountNaira,
    region
  };
}

export async function getRegionalPrice(req: NextRequest | Headers, tier: PriceTierValue): Promise<RegionalPrice> {
  const config = await getFinanceConfig();
  return getRegionalPriceFromConfig(req, tier, config);
}

export function getFamilyPassPriceFromConfig(req: NextRequest | Headers, config: PricingConfigValues) {
  const { currency, region } = getRegionalCurrency(req);
  if (currency === 'NGN') {
    return { currency: 'NGN', region, amountMinor: 0, amountNaira: 0 };
  }
  const amountMinor = getFamilyPassMinor(config, currency as 'USD' | 'EUR' | 'GBP' | 'CAD');
  const amountNaira = Math.round((amountMinor / 100) * getFxRate(currency));
  return { currency, region, amountMinor, amountNaira };
}

export async function getFamilyPassPrice(req: NextRequest | Headers) {
  const config = await getFinanceConfig();
  return getFamilyPassPriceFromConfig(req, config);
}
