import { PrismaClient, PriceTier, RightsTier, VideoStatus, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getFirebaseAdminAuth, hasFirebaseAdminConfig } from '@/lib/firebase-admin';

const prisma = new PrismaClient();

async function upsertFirebaseUser({
  email,
  password,
  phone
}: {
  email: string;
  password: string;
  phone: string;
}) {
  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const auth = getFirebaseAdminAuth();

  try {
    const existing = await auth.getUserByEmail(email);
    const updated = await auth.updateUser(existing.uid, {
      email,
      password,
      phoneNumber: phone,
      emailVerified: true,
      disabled: false
    });
    return updated.uid;
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code !== 'auth/user-not-found') {
      throw error;
    }

    const created = await auth.createUser({
      email,
      password,
      phoneNumber: phone,
      emailVerified: true
    });
    return created.uid;
  }
}

async function main() {
  const adminEmail = 'admin@acestudio.local';
  const creatorEmail = 'creator@acestudio.local';
  const userEmail = 'viewer@acestudio.local';

  const adminPlainPassword = 'AdminPass123!';
  const creatorPlainPassword = 'CreatorPass123!';
  const userPlainPassword = 'ViewerPass123!';

  const adminPassword = await bcrypt.hash(adminPlainPassword, 10);
  const creatorPassword = await bcrypt.hash(creatorPlainPassword, 10);
  const userPassword = await bcrypt.hash(userPlainPassword, 10);

  const adminFirebaseUid = await upsertFirebaseUser({
    email: adminEmail,
    password: adminPlainPassword,
    phone: '+2348000000001'
  });
  const creatorFirebaseUid = await upsertFirebaseUser({
    email: creatorEmail,
    password: creatorPlainPassword,
    phone: '+2348000000002'
  });
  const userFirebaseUid = await upsertFirebaseUser({
    email: userEmail,
    password: userPlainPassword,
    phone: '+2348000000003'
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: Role.ADMIN,
      passwordHash: adminPassword,
      phone: '+2348000000001',
      firebaseUid: adminFirebaseUid ?? undefined
    },
    create: {
      email: adminEmail,
      phone: '+2348000000001',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      firebaseUid: adminFirebaseUid ?? undefined,
      wallet: { create: {} }
    }
  });

  const creator = await prisma.user.upsert({
    where: { email: creatorEmail },
    update: {
      role: Role.CREATOR,
      passwordHash: creatorPassword,
      phone: '+2348000000002',
      firebaseUid: creatorFirebaseUid ?? undefined
    },
    create: {
      email: creatorEmail,
      phone: '+2348000000002',
      passwordHash: creatorPassword,
      role: Role.CREATOR,
      firebaseUid: creatorFirebaseUid ?? undefined,
      wallet: { create: {} },
      creator: { create: { displayName: 'Studio Danfo' } }
    }
  });

  await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: Role.USER,
      passwordHash: userPassword,
      phone: '+2348000000003',
      firebaseUid: userFirebaseUid ?? undefined
    },
    create: {
      email: userEmail,
      phone: '+2348000000003',
      passwordHash: userPassword,
      role: Role.USER,
      firebaseUid: userFirebaseUid ?? undefined,
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
          priceTier: PriceTier.PREMIERE,
          rightsTier: RightsTier.EXCLUSIVE,
          status: VideoStatus.APPROVED,
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
          description: "Short documentary series on Nigeria's tastiest corners.",
          videoType: 'SERIES',
          ageRating: 'ALL',
          category: 'Documentary',
          genres: ['docu', 'food', 'series'],
          priceTier: PriceTier.STANDARD,
          rightsTier: RightsTier.SHARED,
          status: VideoStatus.APPROVED,
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

  console.log('Seed complete', {
    adminEmail,
    creatorEmail,
    userEmail,
    firebaseUsersProvisioned: Boolean(adminFirebaseUid && creatorFirebaseUid && userFirebaseUid)
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
