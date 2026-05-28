import {
  S3Client,
  PutBucketCorsCommand
} from '@aws-sdk/client-s3';
import { existsSync, readFileSync } from 'node:fs';

function loadDotEnvFile(path) {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;

    const [, name, rawValue] = match;
    if (process.env[name]) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[name] = value;
  }
}

loadDotEnvFile('.env.local');
loadDotEnvFile('.env.production');
loadDotEnvFile('.env');

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

const endpoint = process.env.R2_ENDPOINT?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();
const region = process.env.R2_REGION?.trim() || 'auto';

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ENDPOINT, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY.');
  process.exit(1);
}

const buckets = unique([
  process.env.R2_BUCKET?.trim(),
  process.env.R2_BUCKET_NAME?.trim(),
  ...splitList(process.env.R2_CORS_BUCKETS)
]);

if (!buckets.length) {
  console.error('Set R2_BUCKET or pass R2_CORS_BUCKETS=bucket-a,bucket-b.');
  process.exit(1);
}

const origins = unique([
  'https://www.acestudio.ng',
  'https://acestudio.ng',
  process.env.ACE_APP_BASE_URL?.trim(),
  ...splitList(process.env.R2_CORS_ORIGINS)
]);

const client = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const corsConfiguration = {
  CORSRules: [
    {
      AllowedOrigins: origins,
      AllowedMethods: ['GET', 'PUT', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600
    }
  ]
};

for (const bucket of buckets) {
  console.log(`Applying R2 CORS to ${bucket} for origins: ${origins.join(', ')}`);
  await client.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: corsConfiguration
  }));
}

console.log('R2 CORS updated.');
