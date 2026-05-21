import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Missing Prisma arguments.');
  process.exit(1);
}

const usesDirectUrl = args[0] === 'migrate' || (args[0] === 'db' && args[1] === 'execute');
const env = { ...process.env };

function loadDotEnvFile(path) {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;

    const [, name, rawValue] = match;
    if (env[name]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[name] = value;
  }
}

loadDotEnvFile('.env.local');
loadDotEnvFile('.env');
loadDotEnvFile('.env.production');

if (usesDirectUrl && env.DIRECT_URL) {
  env.DATABASE_URL = env.DIRECT_URL;
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
