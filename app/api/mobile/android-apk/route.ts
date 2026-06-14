import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { NextResponse, type NextRequest } from 'next/server';
import { getObjectMetadata, getObjectStream, hasConfiguredBunnyStorage } from '@/lib/bunny-storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DEFAULT_ANDROID_APK_STORAGE_KEY = 'downloads/ace-studio-android.apk';
const DOWNLOAD_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, max-age=0, s-maxage=0, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store'
};

const APK_DOWNLOAD_FILENAME = 'ace-studio-android.apk';

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

type AndroidApkSource =
  | { kind: 'url'; url: string }
  | { kind: 'local'; url: string }
  | { kind: 'storage'; key: string; metadata: Awaited<ReturnType<typeof getObjectMetadata>> };

function buildAttachmentHeaders(contentType?: string, contentLength?: number, contentRange?: string) {
  return {
    'Content-Disposition': `attachment; filename="${APK_DOWNLOAD_FILENAME}"`,
    'Content-Type': contentType || 'application/vnd.android.package-archive',
    'Accept-Ranges': 'bytes',
    ...(typeof contentLength === 'number' && Number.isFinite(contentLength)
      ? { 'Content-Length': String(contentLength) }
      : {}),
    ...(contentRange ? { 'Content-Range': contentRange } : {})
  };
}

async function resolveAndroidApkSource(req: NextRequest): Promise<AndroidApkSource | null> {
  const configuredUrl = process.env.ACE_ANDROID_APK_URL?.trim();
  const configuredUrlIsTemporary = configuredUrl ? isTemporarySignedUrl(configuredUrl) : false;

  if (configuredUrl && !configuredUrlIsTemporary) {
    return { kind: 'url', url: configuredUrl };
  }

  const localApkPath = path.join(process.cwd(), 'public', 'downloads', APK_DOWNLOAD_FILENAME);
  if (fs.existsSync(localApkPath)) {
    return { kind: 'local', url: new URL(`/downloads/${APK_DOWNLOAD_FILENAME}`, req.url).toString() };
  }

  const primaryStorageKey = process.env.ACE_ANDROID_APK_STORAGE_KEY?.trim() || DEFAULT_ANDROID_APK_STORAGE_KEY;
  if (hasConfiguredBunnyStorage()) {
    try {
      const metadata = await getObjectMetadata(primaryStorageKey);
      if ((metadata.ContentLength ?? 0) > 0) {
        return { kind: 'storage', key: primaryStorageKey, metadata };
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const apkSource = await resolveAndroidApkSource(req);
  if (!apkSource) {
    return NextResponse.json(
      {
        error: 'Native Android APK is not available yet.',
        details: 'Upload ace-studio-android.apk to Bunny Storage and set ACE_ANDROID_APK_URL or ACE_ANDROID_APK_STORAGE_KEY.'
      },
      { status: 404 }
    );
  }

  if (apkSource.kind === 'url' || apkSource.kind === 'local') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: apkSource.url,
        ...DOWNLOAD_CACHE_HEADERS
      }
    });
  }

  const range = req.headers.get('range') ?? undefined;
  const apkObject = await getObjectStream(apkSource.key, range);
  const body = apkObject.Body ? Readable.toWeb(apkObject.Body) as ReadableStream : null;

  return new Response(body, {
    status: apkObject.ContentRange ? 206 : 200,
    headers: {
      ...DOWNLOAD_CACHE_HEADERS,
      ...buildAttachmentHeaders(apkObject.ContentType, apkObject.ContentLength, apkObject.ContentRange)
    }
  });
}

export async function HEAD(req: NextRequest) {
  const apkSource = await resolveAndroidApkSource(req);
  if (!apkSource) {
    return new Response(null, { status: 404 });
  }

  if (apkSource.kind === 'url' || apkSource.kind === 'local') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: apkSource.url,
        ...DOWNLOAD_CACHE_HEADERS
      }
    });
  }

  return new Response(null, {
    status: 200,
    headers: {
      ...DOWNLOAD_CACHE_HEADERS,
      ...buildAttachmentHeaders(apkSource.metadata.ContentType, apkSource.metadata.ContentLength)
    }
  });
}
