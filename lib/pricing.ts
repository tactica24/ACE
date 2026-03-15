import { NextRequest } from 'next/server';
import { PriceTier } from '@prisma/client';
import { getGeoContext, getGeoContextFromHeaders, isDiaspora } from './geo';
import { env } from './env';

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

const NGN_PRICES: Record<PriceTier, number> = {
  SNACK: 100,
  STANDARD: 200,
  PREMIERE: 500
};

const USD_PRICES: Record<PriceTier, number> = {
  SNACK: 1.49,
  STANDARD: 1.99,
  PREMIERE: 2.49
};

const GBP_PRICES: Record<PriceTier, number> = {
  SNACK: 0.99,
  STANDARD: 1.49,
  PREMIERE: 1.99
};

const CAD_PRICES: Record<PriceTier, number> = {
  SNACK: 1.99,
  STANDARD: 2.49,
  PREMIERE: 2.99
};

const FAMILY_PASS_PRICES: Record<string, number> = {
  USD: 10,
  GBP: 8,
  CAD: 13
};

export function getFxRate(currency: string) {
  if (currency === 'USD') return Number(env.ACE_USD_NGN_RATE ?? 1600);
  if (currency === 'GBP') return Number(env.ACE_GBP_NGN_RATE ?? 2000);
  if (currency === 'CAD') return Number(env.ACE_CAD_NGN_RATE ?? 1200);
  return 1;
}

export function getRegionalCurrency(req: NextRequest | Headers): RegionalCurrency {
  const { country } = req instanceof Headers ? getGeoContextFromHeaders(req) : getGeoContext(req);
  if (!isDiaspora(country) || country === 'NG') {
    return { currency: 'NGN', region: 'NG' };
  }
  if (country === 'GB' || country === 'UK') return { currency: 'GBP', region: 'DIASPORA' };
  if (country === 'CA') return { currency: 'CAD', region: 'DIASPORA' };
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

export function getFamilyPassPrice(req: NextRequest | Headers) {
  const { currency, region } = getRegionalCurrency(req);
  if (currency === 'NGN') {
    return { currency: 'NGN', region, amountMinor: 0, amountNaira: 0 };
  }
  const amount = FAMILY_PASS_PRICES[currency] ?? FAMILY_PASS_PRICES.USD;
  const amountMinor = Math.round(amount * 100);
  const amountNaira = Math.round(amount * getFxRate(currency));
  return { currency, region, amountMinor, amountNaira };
}

export function getRegionalPrice(req: NextRequest | Headers, tier: PriceTier): RegionalPrice {
  const { country } = req instanceof Headers ? getGeoContextFromHeaders(req) : getGeoContext(req);
  if (!isDiaspora(country) || country === 'NG') {
    const amountNaira = NGN_PRICES[tier];
    return { currency: 'NGN', amountMinor: amountNaira * 100, amountNaira, region: 'NG' };
  }

  if (country === 'GB' || country === 'UK') {
    const amount = GBP_PRICES[tier];
    return {
      currency: 'GBP',
      amountMinor: Math.round(amount * 100),
      amountNaira: Math.round(amount * getFxRate('GBP')),
      region: 'DIASPORA'
    };
  }

  if (country === 'CA') {
    const amount = CAD_PRICES[tier];
    return {
      currency: 'CAD',
      amountMinor: Math.round(amount * 100),
      amountNaira: Math.round(amount * getFxRate('CAD')),
      region: 'DIASPORA'
    };
  }

  const amount = USD_PRICES[tier];
  return {
    currency: 'USD',
    amountMinor: Math.round(amount * 100),
    amountNaira: Math.round(amount * getFxRate('USD')),
    region: 'DIASPORA'
  };
}
