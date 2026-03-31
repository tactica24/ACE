import { spawnSync } from 'node:child_process';

const repairTargets = [
  {
    migrationName: '202603170001_tv_pairing',
    repairFile: 'scripts/repair-tv-pairing-migration.sql'
  },
  {
    migrationName: '202603300001_admin_support_hardening',
    repairFile: 'scripts/repair-admin-support-hardening-migration.sql'
  },
  {
    migrationName: '202603300003_user_phone_verification',
    repairFile: 'scripts/repair-user-phone-verification-migration.sql'
  }
];

const benignPatterns = [
  /not in a failed state/i,
  /already recorded as applied/i,
  /could not be found/i
];

function runPrisma(args) {
  return spawnSync(process.execPath, ['scripts/run-prisma.mjs', ...args], {
    encoding: 'utf8',
    env: process.env
  });
}

for (const target of repairTargets) {
  const executeResult = runPrisma([
    'db',
    'execute',
    '--file',
    target.repairFile,
    '--schema',
    'prisma/schema.prisma'
  ]);
  const executeOutput = `${executeResult.stdout ?? ''}${executeResult.stderr ?? ''}`;

  if (executeResult.status !== 0) {
    process.stderr.write(executeOutput);
    process.exit(executeResult.status ?? 1);
  }

  const resolveResult = runPrisma(['migrate', 'resolve', '--applied', target.migrationName]);
  const resolveOutput = `${resolveResult.stdout ?? ''}${resolveResult.stderr ?? ''}`;

  if (resolveResult.status === 0) {
    console.log(`Repaired and marked migration as applied: ${target.migrationName}`);
    continue;
  }

  if (benignPatterns.some((pattern) => pattern.test(resolveOutput))) {
    console.log(`No additional migration resolve needed for: ${target.migrationName}`);
    continue;
  }

  process.stderr.write(resolveOutput);
  process.exit(resolveResult.status ?? 1);
}
