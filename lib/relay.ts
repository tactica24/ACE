import { NextRequest } from 'next/server';
import { env } from './env';
import { getGeoContext, isDiaspora, isNigeria, isSouthernAfrica } from './geo';

export function getConfiguredRelayTargets() {
  return [env.ACE_NODE_LAGOS_URL, env.ACE_NODE_ABUJA_URL, env.ACE_NODE_JHB_URL].filter(Boolean) as string[];
}

export function getRelayBaseUrl(req: NextRequest) {
  const { country, regionHint } = getGeoContext(req);

  if (isDiaspora(country)) {
    return env.ACE_NODE_LAGOS_URL ?? env.ACE_NODE_ABUJA_URL ?? env.ACE_NODE_JHB_URL ?? null;
  }

  if (isSouthernAfrica(country)) {
    return env.ACE_NODE_JHB_URL ?? env.ACE_NODE_LAGOS_URL ?? null;
  }

  if (isNigeria(country)) {
    if (regionHint?.toUpperCase().includes('NORTH')) return env.ACE_NODE_ABUJA_URL ?? env.ACE_NODE_LAGOS_URL ?? null;
    if (regionHint?.toUpperCase().includes('SOUTH')) return env.ACE_NODE_LAGOS_URL ?? env.ACE_NODE_ABUJA_URL ?? null;
    return env.ACE_NODE_LAGOS_URL ?? env.ACE_NODE_ABUJA_URL ?? null;
  }

  return env.ACE_NODE_LAGOS_URL ?? env.ACE_NODE_ABUJA_URL ?? env.ACE_NODE_JHB_URL ?? null;
}

export function shouldRedirectToRelay(req: NextRequest, targetBaseUrl: string | null) {
  if (!targetBaseUrl) return false;
  const currentHost = req.headers.get('host');
  if (!currentHost) return false;
  try {
    const target = new URL(targetBaseUrl);
    return target.host !== currentHost;
  } catch {
    return false;
  }
}

export function buildRelayUrl(req: NextRequest, targetBaseUrl: string) {
  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, targetBaseUrl);
  return url.toString();
}
