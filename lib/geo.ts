import { NextRequest } from 'next/server';

export type GeoContext = {
  country: string | null;
  regionHint: string | null;
};

export function getGeoContextFromHeaders(headers: Headers) {
  const country =
    headers.get('x-ace-country') ||
    headers.get('cf-ipcountry') ||
    headers.get('x-country') ||
    headers.get('x-geo-country');
  const regionHint = headers.get('x-ace-region');
  return { country: country ? country.toUpperCase() : null, regionHint };
}

export function getGeoContext(req: NextRequest) {
  return getGeoContextFromHeaders(req.headers);
}

export function isDiaspora(country: string | null) {
  if (!country) return false;
  const diaspora = ['US', 'GB', 'UK', 'CA', 'DE', 'FR', 'NL', 'IT', 'ES', 'SE', 'NO', 'DK', 'IE', 'BE'];
  return diaspora.includes(country);
}

export function isSouthernAfrica(country: string | null) {
  if (!country) return false;
  return ['ZA', 'ZW', 'ZM', 'BW', 'NA', 'MZ', 'AO'].includes(country);
}

export function isNigeria(country: string | null) {
  return country === 'NG';
}
