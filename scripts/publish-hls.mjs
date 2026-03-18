import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const args = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, raw = ''] = value.replace(/^--/, '').split('=');
  return [key, raw];
}));

const videoId = args.videoId;
const inputRoot = args.input || path.resolve('storage', 'hls');
const localDir = path.join(inputRoot, videoId || '');

if (!videoId) {
  console.error('Usage: node scripts/publish-hls.mjs --videoId=abc123 [--input=storage/hls]');
  process.exit(1);
}

const client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filePath.endsWith('.m4s') || filePath.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

const files = walk(localDir);
for (const filePath of files) {
  const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
  const key = `streams/${videoId}/${relativePath}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: readFileSync(filePath),
    ContentType: contentTypeFor(filePath)
  }));
  console.log(`uploaded ${key}`);
}
