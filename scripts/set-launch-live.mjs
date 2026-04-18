import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setLaunchMode(mode) {
  try {
    const siteSettings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: { homePageMode: mode },
      create: {
        id: 'default',
        homePageMode: mode,
        launchTitle: 'ACE is launching soon',
        launchMessage: 'We are getting the catalog, producers, and launch details ready.'
      }
    });

    console.log(`✓ App launch state set to ${mode}`);
    console.log('Current homePageMode:', siteSettings.homePageMode);
  } catch (error) {
    console.error('✗ Failed to set launch state:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const mode = process.argv[2]?.toUpperCase();

if (!mode || (mode !== 'LIVE' && mode !== 'LAUNCH')) {
  console.log('Usage: node scripts/set-launch-live.mjs [LIVE|LAUNCH]');
  console.log('Example: node scripts/set-launch-live.mjs LIVE');
  console.log('Example: node scripts/set-launch-live.mjs LAUNCH');
  process.exit(1);
}

setLaunchMode(mode);
