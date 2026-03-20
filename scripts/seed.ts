import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@acestudio.local';
  const creatorEmail = 'creator@acestudio.local';
  const userEmail = 'viewer@acestudio.local';

  const adminPassword = await bcrypt.hash('AdminPass123!', 10);
  const creatorPassword = await bcrypt.hash('CreatorPass123!', 10);
  const userPassword = await bcrypt.hash('ViewerPass123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN', passwordHash: adminPassword, phone: '+2348000000001' },
    create: {
      email: adminEmail,
      phone: '+2348000000001',
      passwordHash: adminPassword,
      role: 'ADMIN',
      wallet: { create: {} }
    }
  });

  const creator = await prisma.user.upsert({
    where: { email: creatorEmail },
    update: { role: 'CREATOR', passwordHash: creatorPassword, phone: '+2348000000002' },
    create: {
      email: creatorEmail,
      phone: '+2348000000002',
      passwordHash: creatorPassword,
      role: 'CREATOR',
      wallet: { create: {} },
      creator: { create: { displayName: 'Studio Danfo' } }
    }
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    update: { role: 'USER', passwordHash: userPassword, phone: '+2348000000003' },
    create: {
      email: userEmail,
      phone: '+2348000000003',
      passwordHash: userPassword,
      role: 'USER',
      wallet: { create: { balanceNaira: 2000, credits: 5 } }
    }
  });

  const videos = await prisma.video.findMany({ where: { creatorId: creator.id } });
  if (videos.length === 0) {
    await prisma.video.createMany({
      data: [
        {
          creatorId: creator.id,
          title: 'Lagos After Dark',
          description: 'A neon-lit thriller through the backstreets of Lagos.',
          videoType: 'FEATURE',
          ageRating: 'PG16',
          category: 'Thriller',
          genres: ['thriller', 'noir', 'crime'],
          priceTier: 'PREMIERE',
          rightsTier: 'EXCLUSIVE',
          status: 'APPROVED',
          durationSec: 5400,
          teaserSec: 300,
          highlightSeconds: [45, 120, 210],
          r2Key: 'samples/lagos-after-dark.mp4',
          posterKey: 'samples/lagos-after-dark.jpg',
          tags: ['thriller', 'lagos', 'noir']
        },
        {
          creatorId: creator.id,
          title: 'Street Food Stories',
          description: 'Short documentary series on Nigeria\'s tastiest corners.',
          videoType: 'SERIES',
          ageRating: 'ALL',
          category: 'Documentary',
          genres: ['docu', 'food', 'series'],
          priceTier: 'STANDARD',
          rightsTier: 'SHARED',
          status: 'APPROVED',
          durationSec: 1800,
          teaserSec: 180,
          highlightSeconds: [30, 90, 150],
          r2Key: 'samples/street-food-stories.mp4',
          posterKey: 'samples/street-food-stories.jpg',
          tags: ['docu', 'food', 'series']
        }
      ]
    });
  }

  console.log('Seed complete', { adminEmail, creatorEmail, userEmail });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

