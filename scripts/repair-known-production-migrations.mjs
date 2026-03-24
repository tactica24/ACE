import { spawnSync } from 'node:child_process';

const knownFailedMigrations = ['202603170001_tv_pairing'];
const benignPatterns = [
  /not in a failed state/i,
  /could not be found/i,
  /already recorded as rolled back/i,
  /already recorded as applied/i
];

function runPrisma(args) {
  return spawnSync(process.execPath, ['scripts/run-prisma.mjs', ...args], {
    encoding: 'utf8',
    env: process.env
  });
}

for (const migrationName of knownFailedMigrations) {
  const result = runPrisma(['migrate', 'resolve', '--rolled-back', migrationName]);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    console.log(`Resolved failed migration as rolled back: ${migrationName}`);
    continue;
  }

  if (benignPatterns.some((pattern) => pattern.test(output))) {
    console.log(`No repair needed for migration: ${migrationName}`);
    continue;
  }

  process.stderr.write(output);
  process.exit(result.status ?? 1);
}
