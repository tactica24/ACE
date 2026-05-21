import { spawnSync } from 'node:child_process';

// ── helpers ────────────────────────────────────────────────────────────────────

function emit(r) {
  process.stdout.write(r.stdout ?? '');
  process.stderr.write(r.stderr ?? '');
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

function runPrisma(args) {
  return emit(spawnSync(process.execPath, ['scripts/run-prisma.mjs', ...args], {
    encoding: 'utf8', env: process.env,
  }));
}

const RETRIES = [0, 15000, 30000, 45000];
const TRANSIENT = [/P1002/i, /advisory lock/i, /timed out/i, /Please try again/i];

function isTransientThereshold(o) {
  return TRANSIENT.some((p) => p.test(o ?? ''));
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ── P3009 self-healing ─────────────────────────────────────────────────────────

/**
 * Extract a Prisma migration name from any Prisma output stream.
 *
 * All migration names follow the format YYMMDDhhmm_<slug> (12 digits + underscore
 * + word chars), visible in the P3009 error message surrounded by backtick
 * quotes, and also present as a bare token in the error body.  This
 * function needs absolutely no parser for the quote style or localisation
 * language — the timestamp prefix gives a safe, unambiguous anchor.
 */
const FAILED_NAME_PATTERN = /[0-9]{12}_[A-Za-z0-9_]+/g;

function parseFailedMigrationName(combined, { stdout, stderr } = {}) {
  /** Try to extract the first date-name from a single stream. */
  const scan = (s) => {
    if (!s) return null;
    // 1. Quoted form (most visible)
    const quoted = s.match(/`[0-9]{12}_[A-Za-z0-9_]+`/);
    if (quoted) return quoted[0].replace(/`/g, '');
    // 2. Bare form (number-only prefixes)
    const m = FAILED_NAME_PATTERN.exec(s);
    if (m) return m[0];
    // 3. [failed] table row
    const b = s.match(/\[failed\].*?([0-9]{12}_[A-Za-z0-9_]+)/i);
    if (b) return b[1];
    return null;
  };

  return scan(combined) ?? scan(stdout) ?? scan(stderr) ?? null;
}

// ── self-healing deploy ─────────────────────────────────────────────────────────

function runMigrateDeploy(attempt) {
  attempt = attempt || 0;
  if (attempt > 0) {
    const delay = RETRIES[Math.min(attempt - 1, RETRIES.length - 1)];
    console.log('Retrying Prisma production migrations in ' + Math.round(delay / 1000) + 's...');
    sleep(delay);
  }
  console.log(
    'Running Prisma production migrations' +
    (attempt > 0 ? ' (attempt ' + (attempt + 1) + ')' : '') + '...'
  );
  const result = spawnSync(process.execPath, ['scripts/run-prisma.mjs', 'migrate', 'deploy'], {
    encoding: 'utf8', env: process.env,
  });
  const combined = emit(result);

  if (result.status === 0) return true;

  // ── P3009 recovery ───────────────────────────────────────────────────────────
  if (result.status === 1 && /P3009/i.test(combined)) {
    // Emit DIAG raw streams for future debugging
    if (result.stdout) {
      const trimmed = result.stdout.length > 600
        ? result.stdout.substring(0, 600) + '\n… stdout truncated …\n'
        : result.stdout;
      process.stderr.write('\n[DIAG migrate-deploy stdout ' + result.stdout.length + 'B]\n' + trimmed);
    }
    if (result.stderr) {
      const trimmed = result.stderr.length > 1000
        ? result.stderr.substring(0, 1000) + '\n… stderr truncated …\n'
        : result.stderr;
      process.stderr.write('\n[DIAG migrate-deploy stderr ' + result.stderr.length + 'B]\n' + trimmed);
    }

    const failedName = parseFailedMigrationName(combined, {
      stdout: result.stdout,
      stderr: result.stderr,
    });

    if (failedName) {
      console.error(
        'P3009: migration \'' + failedName + '\' is in a failed state. ' +
        'Auto-resolving as rolled-back then retrying...'
      );
      const rr = spawnSync(
        process.execPath,
        ['scripts/run-prisma.mjs', 'migrate', 'resolve', '--rolled-back', failedName],
        { encoding: 'utf8', env: process.env }
      );
      emit(rr);

      if (rr.status === 0) {
        console.log('Resolved ' + failedName + ' as rolled-back. Running migrate deploy again…');
        return runMigrateDeploy(attempt + 1);
      }
      console.error('Could not roll-back ' + failedName);
      return false;
    }

    console.error(
      'P3009 encountered but the failed migration name could not be parsed.\n' +
      'Run: npm run db:repair:known'
    );
    return false;
  }

  // ── Transient failure (DB lock, etc.) ───────────────────────────────────────
  if (!isTransientThereshold(combined) || attempt >= 3) {
    console.error('Prisma production migrations unrecoverable.');
    return false;
  }
  return runMigrateDeploy(attempt + 1);
}

// ── pipeline ───────────────────────────────────────────────────────────────────

const steps = [
  {
    label: 'known production migration repairs',
    command: process.execPath,
    args: ['scripts/repair-known-production-migrations.mjs'],
  },
  {
    label: 'Prisma production migrations',
    runner: runMigrateDeploy,
  },
];

function runStep(step, attempt) {
  attempt = attempt || 0;
  const delay = RETRIES[attempt] || 0;
  if (delay > 0) {
    console.log('Retrying ' + step.label + ' in ' + Math.round(delay / 1000) + 's...');
    sleep(delay);
  }
  console.log(
    'Running ' + step.label +
    (attempt > 0 ? ' (attempt ' + (attempt + 1) + ')' : '') + '...'
  );

  let result;
  if (step.runner) {
    result = { status: step.runner() ? 0 : 1 };
  } else {
    result = spawnSync(step.command, step.args, { encoding: 'utf8', env: process.env });
    const c = emit(result);
    if (result.status === 0) return;
    if (result.status === 1 && /P3009/i.test(c)) {
      const failedName = parseFailedMigrationName(c);
      if (failedName) {
        console.error(step.label + ': P3009 leaked (' + failedName + '). Resolving then retrying…');
        runPrisma(['migrate', 'resolve', '--rolled-back', failedName]);
        runStep(step, attempt + 1);
        return;
      }
    }
    if (!isTransientThereshold(c) || attempt >= 3) {
      console.error('FATAL: ' + step.label + ' exited with code ' + result.status);
      process.exit(result.status || 1);
    }
    console.warn(step.label + ' transient error; retrying…');
    runStep(step, attempt + 1);
    return;
  }

  if (result.status === 0) return;
  console.error('FATAL: ' + step.label + ' exited with code ' + result.status);
  process.exit(result.status || 1);
}

for (const step of steps) {
  runStep(step);
}
