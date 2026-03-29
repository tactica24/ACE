import { NextRequest } from 'next/server';

export type GeoContext = {
  country: string | null;
  regionHint: string | null;
};

const COUNTRY_HEADER_KEYS = [
  'x-ace-country',
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country',
  'x-geo-country'
] as const;

const REGION_HEADER_KEYS = [
  'x-ace-region',
  'x-vercel-ip-country-region',
  'cf-region-code',
  'cloudfront-viewer-country-region'
] as const;

function normalizeCountry(country: string | null) {
  if (!country) return null;

  const normalized = country.trim().toUpperCase();
  if (!normalized || ['XX', 'ZZ', 'T1', 'UNKNOWN'].includes(normalized)) {
    return null;
  }

  return normalized === 'UK' ? 'GB' : normalized;
}

function inferCountryFromLanguage(headers: Headers) {
  const preferredLanguage = headers.get('accept-language');
  if (!preferredLanguage) return null;

  const regionMatch = preferredLanguage.match(/-[A-Za-z]{2}\b/);
  return normalizeCountry(regionMatch ? regionMatch[0].slice(1) : null);
}

export function getGeoContextFromHeaders(headers: Headers) {
  const country =
    COUNTRY_HEADER_KEYS.map((headerName) => headers.get(headerName)).find(Boolean) ??
    inferCountryFromLanguage(headers);
  const regionHint = REGION_HEADER_KEYS.map((headerName) => headers.get(headerName)).find(Boolean) ?? null;

  return { country: normalizeCountry(country), regionHint };
}

export function getGeoContext(req: NextRequest) {
  return getGeoContextFromHeaders(req.headers);
}

export function isDiaspora(country: string | null) {
  if (!country) return false;
  const diaspora = ['US', 'GB', 'CA', 'DE', 'FR', 'NL', 'IT', 'ES', 'SE', 'NO', 'DK', 'IE', 'BE'];
  return diaspora.includes(country);
}

export function isSouthernAfrica(country: string | null) {
  if (!country) return false;
  return ['ZA', 'ZW', 'ZM', 'BW', 'NA', 'MZ', 'AO'].includes(country);
}

export function isNigeria(country: string | null) {
  return country === 'NG';
}
