import { HeadObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeMediaKey } from '@/lib/media';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DEFAULT_ANDROID_APK_R2_KEY = 'downloads/ace-studio-android.apk';
const APK_DOWNLOAD_FILENAME = 'ace-studio-android.apk';
const SIGNED_URL_TTL_SECONDS = 60 * 10;

const DOWNLOAD_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, s-maxage=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Android APK R2 configuration: ${name}`);
  }

  return value;
}

function getAndroidApkR2Client() {
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

function getAndroidApkR2Bucket() {
  return getRequiredEnv('R2_BUCKET');
}

function getAndroidApkR2Key() {
  const key = normalizeMediaKey(process.env.ACE_ANDROID_APK_R2_KEY?.trim() || DEFAULT_ANDROID_APK_R2_KEY);
  if (!key) {
    throw new Error('ACE_ANDROID_APK_R2_KEY must resolve to a valid object key.');
  }

  return key;
}

async function createAndroidApkDownloadUrl() {
  const publicUrl = process.env.ACE_ANDROID_APK_R2_PUBLIC_URL?.trim();
  if (publicUrl) {
    return publicUrl;
  }

  const client = getAndroidApkR2Client();
  const bucket = getAndroidApkR2Bucket();
  const key = getAndroidApkR2Key();

  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );

  return getSignedUrl(
    client as never,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${APK_DOWNLOAD_FILENAME}"`,
      ResponseContentType: 'application/vnd.android.package-archive'
    }) as never,
    {
      expiresIn: SIGNED_URL_TTL_SECONDS
    }
  );
}

async function resolveAndroidApkResponse() {
  try {
    const url = await createAndroidApkDownloadUrl();
    return new Response(null, {
      status: 302,
      headers: {
        Location: url,
        ...DOWNLOAD_CACHE_HEADERS
      }
    });
  } catch (error) {
    console.error('[android-apk] R2 download resolution failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        error: 'Native Android APK is not available right now.',
        details: 'Verify the Android APK exists at the configured R2 object key and that the APK-specific R2 credentials are valid.'
      },
      { status: 404 }
    );
  }
}

export async function GET(_req: NextRequest) {
  return resolveAndroidApkResponse();
}

export async function HEAD(_req: NextRequest) {
  return resolveAndroidApkResponse();
}
