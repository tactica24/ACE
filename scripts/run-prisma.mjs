import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Missing Prisma arguments.');
  process.exit(1);
}

const usesDirectUrl = args[0] === 'migrate' || (args[0] === 'db' && args[1] === 'execute');
const env = { ...process.env };

if (usesDirectUrl && process.env.DIRECT_URL) {
  env.DATABASE_URL = process.env.DIRECT_URL;
}

const localPrismaEntry = resolve('node_modules', 'prisma', 'build', 'index.js');
const useLocalPrisma = existsSync(localPrismaEntry);
const command = useLocalPrisma ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const commandArgs = useLocalPrisma ? [localPrismaEntry, ...args] : ['prisma', ...args];

const result = spawnSync(command, commandArgs, {
  stdio: 'inherit',
  env
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
