import { HeadObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NextResponse, type NextRequest } from 'next/server';
import { normalizeMediaKey } from '@/lib/media';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const DEFAULT_ANDROID_APK_R2_KEY = 'downloads/ace-studio-android.apk';
const APK_DOWNLOAD_FILENAME = 'ace-studio-android.apk';
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

async function getAndroidApkHeadMetadata() {
  const client = getAndroidApkR2Client();
  const bucket = getAndroidApkR2Bucket();
  const key = getAndroidApkR2Key();

  return client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}

async function getAndroidApkObject(range?: string | null) {
  const publicUrl = process.env.ACE_ANDROID_APK_R2_PUBLIC_URL?.trim();
  if (publicUrl) {
    return {
      kind: 'public-url' as const,
      url: publicUrl
    };
  }

  const client = getAndroidApkR2Client();
  const bucket = getAndroidApkR2Bucket();
  const key = getAndroidApkR2Key();

  const object = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range || undefined,
      ResponseContentDisposition: `attachment; filename="${APK_DOWNLOAD_FILENAME}"`,
      ResponseContentType: 'application/vnd.android.package-archive'
    })
  );

  return {
    kind: 'object' as const,
    object
  };
}

function buildDownloadHeaders(input: {
  contentLength?: number;
  contentRange?: string;
  contentType?: string;
}) {
  return {
    ...DOWNLOAD_CACHE_HEADERS,
    'Content-Disposition': `attachment; filename="${APK_DOWNLOAD_FILENAME}"`,
    'Content-Type': input.contentType || 'application/vnd.android.package-archive',
    'Accept-Ranges': 'bytes',
    ...(typeof input.contentLength === 'number' && Number.isFinite(input.contentLength)
      ? { 'Content-Length': String(input.contentLength) }
      : {}),
    ...(input.contentRange ? { 'Content-Range': input.contentRange } : {})
  };
}

async function resolveAndroidApkHeadResponse() {
  try {
    const publicUrl = process.env.ACE_ANDROID_APK_R2_PUBLIC_URL?.trim();
    if (publicUrl) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: publicUrl,
          ...DOWNLOAD_CACHE_HEADERS
        }
      });
    }

    const metadata = await getAndroidApkHeadMetadata();

    return new Response(null, {
      status: 200,
      headers: buildDownloadHeaders({
        contentLength: typeof metadata.ContentLength === 'number' ? metadata.ContentLength : undefined,
        contentType: metadata.ContentType
      })
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

async function resolveAndroidApkGetResponse(req: NextRequest) {
  try {
    const result = await getAndroidApkObject(req.headers.get('range'));

    if (result.kind === 'public-url') {
      return new Response(null, {
        status: 302,
        headers: {
          Location: result.url,
          ...DOWNLOAD_CACHE_HEADERS
        }
      });
    }

    const body = result.object.Body
      ? (result.object.Body as { transformToWebStream?: () => ReadableStream }).transformToWebStream?.() ?? null
      : null;

    return new Response(body, {
      status: result.object.ContentRange ? 206 : 200,
      headers: buildDownloadHeaders({
        contentLength: typeof result.object.ContentLength === 'number' ? result.object.ContentLength : undefined,
        contentRange: result.object.ContentRange,
        contentType: result.object.ContentType
      })
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

export async function GET(req: NextRequest) {
  return resolveAndroidApkGetResponse(req);
}

export async function HEAD(_req: NextRequest) {
  return resolveAndroidApkHeadResponse();
}
