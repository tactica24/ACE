import fs from 'node:fs';
import path from 'node:path';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const configuredUrl = process.env.ACE_ANDROID_APK_URL?.trim();
  if (configuredUrl) {
    return NextResponse.redirect(configuredUrl);
  }

  const localApkPath = path.join(process.cwd(), 'public', 'downloads', 'ace-studio-android.apk');
  if (fs.existsSync(localApkPath)) {
    const localUrl = new URL('/downloads/ace-studio-android.apk', req.url).toString();
    return NextResponse.redirect(localUrl);
  }

  return NextResponse.json(
    {
      error: 'Native Android APK is not available yet.',
      details: 'Build the Flutter Android APK and place it at public/downloads/ace-studio-android.apk, or set ACE_ANDROID_APK_URL.'
    },
    { status: 404 }
  );
}
