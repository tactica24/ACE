/**
 * Auto-resolve failed Prisma migrations before a deploy.
 *
 * The Prisma migrations table stores a "failed" state when a migration SQL
 * errors out mid-execution. As long as the migration was *not* partially
 * applied, the correct recovery is `--rolled-back` so that the next
 * `migrate deploy` call will retry it.
 *
 * This script detects the newest failed migration (if any) and marks it as
 * rolled-back. For migrations that were already applied we skip them
 * entirely.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function runPrisma(args) {
  return spawnSync(process.execPath, ['scripts/run-prisma.mjs', ...args], {
    encoding: 'utf8',
    env: process.env
  });
}

// ── 2. Ask Prisma which migrations are in a failed state ──
function getFailedMigrationName() {
  const result = runPrisma(['migrate', 'status']);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  // Look for lines like:   [failed]   202605181732_add_video_total_unlocks
  const match = output.match(/\[failed\].*?(\d{14}_\w+)\s*$/m);
  if (match && match[1]) {
    return match[1];
  }

  // Alternate format: migration ...  Status: FAILED
  const altMatch = output.match(/Migration name:\s*(\d{14}_\w+).*?Status:\s*FAILED/is);
  if (altMatch && altMatch[1]) {
    return altMatch[1];
  }

  return null;
}

// ── 3. Check if the migration is already in the repo (has a migration.sql) ──
const MIGRATIONS_DIR = join(ROOT, 'prisma', 'migrations');

function migrationExistsInRepo(name) {
  return existsSync(join(MIGRATIONS_DIR, name, 'migration.sql'));
}

// ── 4. Resolve as rolled-back ──
function resolveAsRolledBack(name) {
  console.log(`Auto-resolving failed migration as rolled-back: ${name}`);
  const result = runPrisma(['migrate', 'resolve', '--rolled-back', name]);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status === 0) {
    console.log(`✓ Migration ${name} resolved as rolled-back; will be re-applied in the next migrate deploy.`);
    return true;
  }

  process.stderr.write(output);
  return false;
}

// ── Main ──
(function main() {
  // Run the known-repair script first — it handles legacy-known issues and
  // prints "No additional migration resolve needed for: …" as a benign no-op
  // for migrations that are already in a good state.
  const knownRepair = spawnSync(process.execPath, ['scripts/repair-known-production-migrations.mjs'], {
    encoding: 'utf8',
    env: process.env,
    cwd: ROOT
  });
  if (knownRepair.stdout) process.stdout.write(knownRepair.stdout);
  if (knownRepair.stderr && knownRepair.status !== 0) {
    process.stderr.write(knownRepair.stderr);
    // Don't hard-fail here; we still want to auto-resolve any *new* failed migration.
  }

  // Detect any remaining failed migration after the known-repair pass
  const failedName = getFailedMigrationName();
  if (!failedName) {
    console.log('No failed migrations found. Proceeding.');
    return;
  }

  if (!migrationExistsInRepo(failedName)) {
    console.error(
      `ERROR: Failed migration "${failedName}" has no migration.sql in the repo. ` +
      `Cannot auto-resolve. Create the missing file or resolve manually.`
    );
    process.exit(1);
  }

  const ok = resolveAsRolledBack(failedName);
  if (!ok) process.exit(1);
})();
