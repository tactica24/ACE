import { type SiteSettings } from '@prisma/client';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { prisma } from './db';

const SITE_SETTINGS_ID = 'default';
const SITE_SETTINGS_TAG = 'site-settings';

const DEFAULT_SITE_SETTINGS: Omit<SiteSettings, 'updatedAt'> = {
  id: SITE_SETTINGS_ID,
  homePageMode: 'LIVE',
  launchTitle: 'ACE is launching soon',
  launchMessage: 'We are getting the catalog, producers, and launch details ready.',
  launchCountdownAt: null,
  launchCtaLabel: null,
  launchCtaHref: null,
  platformSignatureKey: null
};

const getCachedSiteSettings = unstable_cache(
  () =>
    prisma.siteSettings.findUnique({
      where: { id: SITE_SETTINGS_ID }
    }),
  [SITE_SETTINGS_TAG],
  { revalidate: 300, tags: [SITE_SETTINGS_TAG] }
);

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export async function getSiteSettings() {
  if (!hasDatabaseUrl()) {
    return {
      ...DEFAULT_SITE_SETTINGS,
      updatedAt: new Date(0)
    };
  }

  const settings = await getCachedSiteSettings();
  if (settings) {
    return settings;
  }

  return prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: {},
    create: DEFAULT_SITE_SETTINGS
  });
}

export function revalidateSiteSettings() {
  revalidateTag(SITE_SETTINGS_TAG);
  revalidatePath('/');
  revalidatePath('/browse');
  revalidatePath('/highlights');
  revalidatePath('/tv');
}

export async function isLaunchModeActive() {
  const settings = await getSiteSettings();
  return settings.homePageMode === 'LAUNCH';
}
