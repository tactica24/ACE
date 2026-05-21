import { prisma } from './lib/db';

async function main() {
  const count = await prisma.user.count();
  console.log(`User count: ${count}`);
  const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, name: true } });
  console.log('Users:', users);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});