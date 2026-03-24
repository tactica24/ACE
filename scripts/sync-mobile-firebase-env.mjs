import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnvPath = resolve(process.cwd(), '.env');
const mobileEnvPath = resolve(process.cwd(), 'mobile', '.env.local');

if (!existsSync(rootEnvPath)) {
  console.error('Missing .env in the project root. Create it first, then rerun npm run env:sync:mobile.');
  process.exit(1);
}

const envText = readFileSync(rootEnvPath, 'utf8');

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const unwrapped =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue.startsWith("'") && rawValue.endsWith("'")
          ? rawValue.slice(1, -1)
          : rawValue;
    values[key] = unwrapped;
  }
  return values;
}

const rootEnv = parseEnv(envText);

const mappings = [
  ['EXPO_PUBLIC_API_URL', rootEnv.ACE_APP_BASE_URL],
  ['EXPO_PUBLIC_FIREBASE_API_KEY', rootEnv.NEXT_PUBLIC_FIREBASE_API_KEY],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', rootEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', rootEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', rootEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', rootEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', rootEnv.NEXT_PUBLIC_FIREBASE_APP_ID]
];

const missing = mappings.filter(([, value]) => !value).map(([key]) => key);

if (missing.length > 0) {
  console.error(`Missing source values for: ${missing.join(', ')}`);
  console.error('Fill the Firebase NEXT_PUBLIC_* values and ACE_APP_BASE_URL in the root .env first.');
  process.exit(1);
}

const output = [
  '# Generated from the root .env by npm run env:sync:mobile',
  '# Edit the root .env, then rerun the sync script.',
  '',
  ...mappings.map(([key, value]) => `${key}=${JSON.stringify(value)}`),
  ''
].join('\n');

writeFileSync(mobileEnvPath, output, 'utf8');

console.log(`Wrote ${mobileEnvPath}`);
