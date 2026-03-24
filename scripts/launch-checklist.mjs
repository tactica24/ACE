import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const checks = [];

function run(name, command) {
  try {
    execSync(command, { stdio: 'pipe' });
    checks.push({ name, status: 'DONE', note: command });
  } catch (error) {
    const message = error?.stderr?.toString()?.trim() || error?.message || 'command failed';
    checks.push({ name, status: 'BLOCKED', note: `${command} :: ${message.split('\n')[0]}` });
  }
}

function inspectEnv() {
  if (!existsSync('.env')) {
    checks.push({
      name: '.env file present',
      status: 'BLOCKED',
      note: 'Create .env from .env.example before launch.'
    });
    return;
  }

  const envText = readFileSync('.env', 'utf8');
  const required = [
    'DATABASE_URL',
    'ACE_STREAM_SIGNING_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'PAYSTACK_SECRET_KEY',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'ACE_APP_BASE_URL'
  ];

  const missing = required.filter((key) => !new RegExp(`^${key}=`, 'm').test(envText));
  if (missing.length) {
    checks.push({
      name: 'Required launch env keys configured',
      status: 'BLOCKED',
      note: `Missing: ${missing.join(', ')}`
    });
    return;
  }

  const placeholderPatterns = [
    /replace-with-your-project-id/i,
    /replace-with-your-client-email/i,
    /replace-with-your-private-key/i,
    /replace-with-your-web-api-key/i,
    /sk_test_xxx/i,
    /pk_test_xxx/i,
    /<accountid>/i,
    /"replace"/i
  ];
  const hasPlaceholder = placeholderPatterns.some((pattern) => pattern.test(envText));
  checks.push({
    name: 'Required launch env keys configured',
    status: hasPlaceholder ? 'BLOCKED' : 'DONE',
    note: hasPlaceholder ? 'Replace placeholder/test secrets with production values.' : 'No placeholder values detected.'
  });
}

function checkBinary(name) {
  try {
    execSync(`${name} -version`, { stdio: 'pipe' });
    checks.push({ name: `${name} installed`, status: 'DONE', note: `${name} -version` });
  } catch {
    checks.push({
      name: `${name} installed`,
      status: 'WARNING',
      note: `${name} not found in PATH (required only when this host performs local HLS transcoding).`
    });
  }
}

inspectEnv();
checkBinary('ffmpeg');
checkBinary('ffprobe');
run('Type/lint gate', 'npm run lint');
run('Production build gate', 'npm run build');
run('Relay smoke gate', 'npm run smoke:relay');

const done = checks.filter((item) => item.status === 'DONE').length;
const blocked = checks.filter((item) => item.status === 'BLOCKED').length;
const warnings = checks.filter((item) => item.status === 'WARNING').length;

console.log('\nACE Launch Checklist\n');
for (const item of checks) {
  const mark = item.status === 'DONE' ? '[x]' : '[ ]';
  console.log(`${mark} ${item.name} - ${item.status}`);
  console.log(`    ${item.note}`);
}

console.log(`\nSummary: ${done} DONE / ${warnings} WARNING / ${blocked} BLOCKED\n`);

if (blocked > 0) {
  process.exitCode = 1;
}
