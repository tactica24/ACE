import fs from 'node:fs/promises';
import path from 'node:path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const DEFAULT_ANDROID_APK_R2_KEY = 'downloads/ace-studio-android.apk';

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Android APK R2 configuration: ${name}`);
  }

  return value;
}

function getAndroidApkR2Key() {
  const key = (process.env.ACE_ANDROID_APK_R2_KEY || DEFAULT_ANDROID_APK_R2_KEY).trim().replace(/^\/+/, '');
  if (!key) {
    throw new Error('ACE_ANDROID_APK_R2_KEY must resolve to a valid object key.');
  }

  return key;
}

function getR2Client() {
  return new S3Client({
    region: process.env.R2_REGION?.trim() || 'auto',
    endpoint: getRequiredEnv('R2_ENDPOINT'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY')
    }
  });
}

async function main() {
  const apkPathArg = process.argv[2];
  if (!apkPathArg) {
    throw new Error('Usage: node scripts/upload-android-apk-to-r2.mjs <apk-file-path>');
  }

  const apkPath = path.resolve(process.cwd(), apkPathArg);
  const apkBuffer = await fs.readFile(apkPath);
  const client = getR2Client();
  const bucket = getRequiredEnv('R2_BUCKET');
  const key = getAndroidApkR2Key();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: apkBuffer,
      ContentType: 'application/vnd.android.package-archive',
      CacheControl: 'public, max-age=300'
    })
  );

  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );

  console.log(`Uploaded Android APK to R2: ${bucket}/${key}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
