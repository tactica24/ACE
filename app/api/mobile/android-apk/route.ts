import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const configuredUrl = process.env.ACE_ANDROID_APK_URL?.trim();
  if (configuredUrl) {
    return NextResponse.redirect(configuredUrl);
  }

  const localApkPath = path.join(process.cwd(), 'public', 'downloads', 'ace-studio-android.apk');
  try {
    await fs.access(localApkPath);
    const localUrl = new URL('/downloads/ace-studio-android.apk', req.url).toString();
    return NextResponse.redirect(localUrl);
  } catch {
    return NextResponse.json(
      {
        error: 'Android APK is not configured yet.',
        details: 'Set ACE_ANDROID_APK_URL or add public/downloads/ace-studio-android.apk'
      },
      { status: 404 }
    );
  }
}
