import { prisma } from './db';

export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      homePageMode: 'LIVE',
      launchTitle: 'ACE is launching soon',
      launchMessage: 'We are getting the catalog, producers, and launch details ready.'
    }
  });
}

export async function isLaunchModeActive() {
  const settings = await getSiteSettings();
  return settings.homePageMode === 'LAUNCH';
}
