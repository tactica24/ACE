import { createReadStream, readdirSync } from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

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

const bucketName = process.env.HLS_R2_BUCKET || process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || 'ace-studio-media';
const prisma = new PrismaClient();

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filePath.endsWith('.ts')) return 'video/mp2t';
  if (filePath.endsWith('.m4s') || filePath.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

function cacheControlFor(filePath) {
  if (filePath.endsWith('.m3u8')) return 'public, max-age=300';
  if (filePath.endsWith('.ts') || filePath.endsWith('.m4s')) return 'public, max-age=31536000, immutable';
  if (filePath.endsWith('.mp4')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=31536000, immutable';
}

const files = walk(localDir);
const qualities = new Set();
for (const filePath of files) {
  const relativePath = path.relative(localDir, filePath).replace(/\\/g, '/');
  const key = `movies/${videoId}/${relativePath}`;
  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: createReadStream(filePath),
    ContentType: contentTypeFor(filePath),
    CacheControl: cacheControlFor(filePath)
  }));
  console.log(`uploaded ${key}`);

  // Extract quality from path, e.g., 1080/index.m3u8 -> 1080p
  const match = relativePath.match(/^(\d+)\//);
  if (match) qualities.add(`${match[1]}p`);
}

const cdnBaseUrl = (process.env.ACE_CDN_BASE_URL || 'https://stream.acestudio.ng').replace(/\/+$/, '');
const hlsUrl = `${cdnBaseUrl}/movies/${videoId}/master.m3u8`;
await prisma.video.update({
  where: { id: videoId },
  data: {
    hlsUrl,
    hlsVersion: 'hls-v1',
    qualities: Array.from(qualities).sort(),
    status: 'HLS_UPLOADED'
  }
});

await prisma.videoTechnicalMetadata.upsert({
  where: { videoId },
  create: {
    videoId,
    playbackUrl: hlsUrl,
    hlsUploadedAt: new Date(),
    hlsVerifiedAt: new Date(),
    processingStatus: 'HLS_UPLOADED'
  },
  update: {
    playbackUrl: hlsUrl,
    hlsUploadedAt: new Date(),
    hlsVerifiedAt: new Date(),
    processingStatus: 'HLS_UPLOADED'
  }
});

console.log(`HLS uploaded and video updated: ${hlsUrl}`);
