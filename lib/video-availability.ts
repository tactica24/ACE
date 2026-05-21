import { type NextRequest } from 'next/server';
import { getGeoContext, getGeoContextFromHeaders } from '@/lib/geo';

export const VIDEO_AVAILABILITY_REGIONS = ['GLOBAL', 'AFRICA'] as const;
export type VideoAvailabilityRegion = (typeof VIDEO_AVAILABILITY_REGIONS)[number];

const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER',
  'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ',
  'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'
]);

export function normalizeAvailabilityRegion(value: unknown): VideoAvailabilityRegion {
  return value === 'AFRICA' ? 'AFRICA' : 'GLOBAL';
}

export function isAfricanCountry(country: string | null) {
  return Boolean(country && AFRICAN_COUNTRIES.has(country));
}

export function canAccessVideoFromCountry(region: string | null | undefined, country: string | null) {
  const normalizedRegion = normalizeAvailabilityRegion(region);
  if (normalizedRegion === 'GLOBAL') {
    return true;
  }

  if (!country) {
    return true;
  }

  return isAfricanCountry(country);
}

export function getVideoAvailabilityDecision(region: string | null | undefined, req: NextRequest | Headers) {
  const { country } = req instanceof Headers ? getGeoContextFromHeaders(req) : getGeoContext(req);
  const allowed = canAccessVideoFromCountry(region, country);

  return {
    allowed,
    country,
    region: normalizeAvailabilityRegion(region)
  };
}
