import fs from 'fs';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { createSignedStorageUrl, hasConfiguredBunnyStorage } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DEFAULT_ANDROID_APK_STORAGE_KEY = 'downloads/ace-studio-android.apk';
const DOWNLOAD_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, s-maxage=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

function isTemporarySignedUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.searchParams.has('X-Amz-Signature') ||
      url.searchParams.has('X-Amz-Expires') ||
      url.searchParams.has('X-Amz-Credential') ||
      url.searchParams.has('AWSAccessKeyId') ||
      (url.searchParams.has('Expires') && url.searchParams.has('Signature'))
    );
  } catch {
    return false;
  }
}

async function resolveAndroidApkUrl(req: NextRequest) {
  const configuredUrl = process.env.ACE_ANDROID_APK_URL?.trim();
  const configuredUrlIsTemporary = configuredUrl ? isTemporarySignedUrl(configuredUrl) : false;

  if (configuredUrl && !configuredUrlIsTemporary) {
    return configuredUrl;
  }

  const localApkPath = path.join(process.cwd(), 'public', 'downloads', 'ace-studio-android.apk');
  if (fs.existsSync(localApkPath)) {
    return new URL('/downloads/ace-studio-android.apk', req.url).toString();
  }

  const primaryStorageKey = process.env.ACE_ANDROID_APK_STORAGE_KEY?.trim() || DEFAULT_ANDROID_APK_STORAGE_KEY;
  if (hasConfiguredBunnyStorage()) {
    return createSignedStorageUrl(primaryStorageKey);
  }

  return null;
}

export async function GET(req: NextRequest) {
  const apkUrl = await resolveAndroidApkUrl(req);
  if (!apkUrl) {
    return NextResponse.json(
      {
        error: 'Native Android APK is not available yet.',
        details: 'Upload ace-studio-android.apk to Bunny Storage and set ACE_ANDROID_APK_URL or ACE_ANDROID_APK_STORAGE_KEY.'
      },
      { status: 404 }
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: apkUrl,
      ...DOWNLOAD_CACHE_HEADERS
    }
  });
}

export async function HEAD(req: NextRequest) {
  const apkUrl = await resolveAndroidApkUrl(req);
  if (!apkUrl) {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: apkUrl,
      ...DOWNLOAD_CACHE_HEADERS
    }
  });
}
