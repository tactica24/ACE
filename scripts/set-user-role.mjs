import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.env.TARGET_EMAIL?.trim().toLowerCase();
const role = process.env.TARGET_ROLE?.trim().toUpperCase();
const validRoles = new Set(['USER', 'CREATOR', 'ADMIN']);

async function main() {
  if (!email) {
    throw new Error('TARGET_EMAIL is required.');
  }

  if (!role || !validRoles.has(role)) {
    throw new Error('TARGET_ROLE must be one of USER, CREATOR, or ADMIN.');
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true }
  });

  if (!existing) {
    throw new Error(`No user found for email: ${email}`);
  }

  const updated = await prisma.user.update({
    where: { email },
    data: { role },
    select: { id: true, email: true, role: true }
  });

  console.log(`Updated role for ${updated.email}: ${existing.role} -> ${updated.role}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
