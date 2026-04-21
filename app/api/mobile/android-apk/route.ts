import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

const GITHUB_RELEASE_APK_URL = 'https://github.com/tactica24/ACE/releases/download/android-latest/ace-studio-android.apk';

function resolveAndroidApkUrl(req: NextRequest) {
  const configuredUrl = process.env.ACE_ANDROID_APK_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  const localApkPath = path.join(process.cwd(), 'public', 'downloads', 'ace-studio-android.apk');
  if (fs.existsSync(localApkPath)) {
    return new URL('/downloads/ace-studio-android.apk', req.url).toString();
  }

  return GITHUB_RELEASE_APK_URL;
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(resolveAndroidApkUrl(req));
}

export async function HEAD(req: NextRequest) {
  return NextResponse.redirect(resolveAndroidApkUrl(req));
}
