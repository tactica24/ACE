import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootEnvPath = resolve(process.cwd(), '.env');

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
const required = [
  'ACE_APP_BASE_URL',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
];

const missing = required.filter((key) => !rootEnv[key]);

if (missing.length > 0) {
  console.error(`Missing source values for: ${missing.join(', ')}`);
  console.error('Fill the Firebase NEXT_PUBLIC_* values and ACE_APP_BASE_URL in the root .env first.');
  process.exit(1);
}

const baseUrl = rootEnv.ACE_APP_BASE_URL.replace(/\/+$/, '');

console.log('Flutter mobile config looks ready.');
console.log(`Runtime Firebase config endpoint: ${baseUrl}/api/mobile/firebase-config`);
console.log('The Flutter app no longer needs Expo env mirroring.');
console.log('Use npm run build:android-apk or flutter build with --dart-define=ACE_API_BASE_URL=');
