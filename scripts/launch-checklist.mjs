import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const envText = existsSync('.env') ? readFileSync('.env', 'utf8') : '';

function run(name, command) {
  try {
    execSync(command, { stdio: 'pipe' });
    checks.push({ name, status: 'DONE', note: command });
  } catch (error) {
    const message = error?.stderr?.toString()?.trim() || error?.message || 'command failed';
    checks.push({ name, status: 'BLOCKED', note: `${command} :: ${message.split('\n')[0]}` });
  }
}

function addCheck(name, status, note) {
  checks.push({ name, status, note });
}

function getEnvValue(key) {
  const runtimeValue = process.env[key]?.trim();
  if (runtimeValue) return runtimeValue;

  if (!envText) return undefined;
  const match = envText.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match?.[1]?.trim();
}

function inspectEnv() {
  const required = [
    'DATABASE_URL',
    'API_BASE_URL',
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
    'BUNNY_STORAGE_API_KEY',
    'BUNNY_STORAGE_ZONE',
    'BUNNY_STORAGE_ENDPOINT',
    'BUNNY_STORAGE_S3_ENDPOINT',
    'BUNNY_CDN_HOSTNAME',
    'BUNNY_TOKEN_KEY',
    'CONTABO_TRANSCODE_API_URL',
    'CONTABO_PIPELINE_SECRET',
    'ACE_APP_BASE_URL',
    'ACE_UPLOAD_PROXY_BASE_URL'
  ];

  const missing = required.filter((key) => !getEnvValue(key));
  if (missing.length) {
    addCheck('Required launch env keys configured', 'BLOCKED', `Missing: ${missing.join(', ')}`);
    return;
  }

  const inspectedValues = required.map((key) => `${key}=${getEnvValue(key) ?? ''}`).join('\n');
  const placeholderPatterns = [
    /replace-with-your-project-id/i,
    /replace-with-your-client-email/i,
    /replace-with-your-private-key/i,
    /replace-with-your-web-api-key/i,
    /sk_test_xxx/i,
    /pk_test_xxx/i,
    /replace-with-bunny/i,
    /replace-with-random-shared-secret/i,
    /"replace"/i
  ];
  const hasPlaceholder = placeholderPatterns.some((pattern) => pattern.test(inspectedValues));
  addCheck(
    'Required launch env keys configured',
    hasPlaceholder ? 'BLOCKED' : 'DONE',
    hasPlaceholder ? 'Replace placeholder or test secrets with production values.' : 'Runtime environment values are present.'
  );

  const relayConfigured = [
    getEnvValue('ACE_NODE_LAGOS_URL'),
    getEnvValue('ACE_NODE_ABUJA_URL'),
    getEnvValue('ACE_NODE_JHB_URL')
  ].some(Boolean);

  addCheck(
    'Streaming delivery mode',
    relayConfigured ? 'DONE' : 'OPTIONAL',
    relayConfigured
      ? 'Relay delivery endpoints are configured.'
      : 'No relay node is configured yet. The app will stream approved titles through Bunny Storage and signed CDN URLs.'
  );

  if (!existsSync('.env') && !required.some((key) => process.env[key]?.trim())) {
    addCheck('.env file present', 'WARNING', 'No local .env file was found. This is fine if your environment values are injected by the host.');
  } else if (existsSync('.env')) {
    addCheck('.env file present', 'DONE', 'Local .env file detected.');
  } else {
    addCheck('.env file present', 'DONE', 'Environment values are available from the current host.');
  }
}

function checkBinary(name) {
  try {
    execSync(`${name} -version`, { stdio: 'pipe' });
    checks.push({ name: `${name} installed`, status: 'DONE', note: `${name} -version` });
  } catch {
    checks.push({
      name: `${name} installed`,
      status: 'WARNING',
      note: `${name} not found in PATH (optional; useful only when this host normalizes MP4 masters).`
    });
  }
}

inspectEnv();
checkBinary('ffmpeg');
checkBinary('ffprobe');
run('Type/lint gate', 'npm run lint');
run('Production build gate', 'npm run build');
run('App health smoke gate', 'npm run smoke:relay');

const done = checks.filter((item) => item.status === 'DONE').length;
const blocked = checks.filter((item) => item.status === 'BLOCKED').length;
const warnings = checks.filter((item) => item.status === 'WARNING').length;
const optional = checks.filter((item) => item.status === 'OPTIONAL').length;

console.log('\nACE Launch Checklist\n');
for (const item of checks) {
  const mark = item.status === 'DONE' ? '[x]' : item.status === 'OPTIONAL' ? '[-]' : '[ ]';
  console.log(`${mark} ${item.name} - ${item.status}`);
  console.log(`    ${item.note}`);
}

console.log(`\nSummary: ${done} DONE / ${optional} OPTIONAL / ${warnings} WARNING / ${blocked} BLOCKED\n`);

if (blocked > 0) {
  process.exitCode = 1;
}
