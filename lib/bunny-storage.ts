import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from './env';
import { normalizeMediaKey } from './media';

const OBJECT_METADATA_TTL_MS = 1000 * 60 * 10;
const UPLOAD_TOKEN_TTL = '30m';

export type StoredObjectMetadata = {
  ContentLength?: number;
  ContentType?: string;
  LastModified?: Date;
};

export type StoredObjectResponse = {
  Body?: Readable;
  ContentLength?: number;
  ContentType?: string;
  ContentRange?: string;
};

type UploadTokenPayload = {
  key: string;
  contentType: string;
};

const objectMetadataCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<StoredObjectMetadata>;
  }
>();

function requireBunnyStorageConfig() {
  if (!hasConfiguredBunnyStorage()) {
    throw new Error('Bunny Storage is not configured. Set BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE, and BUNNY_STORAGE_ENDPOINT.');
  }
}

function getStorageEndpoint() {
  return (env.BUNNY_STORAGE_ENDPOINT || 'https://storage.bunnycdn.com').replace(/\/+$/, '');
}

function encodeStorageKey(key: string) {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) {
    throw new Error('Storage key is required.');
  }

  return normalizedKey.split('/').map(encodeURIComponent).join('/');
}

function getStorageUrl(key: string) {
  return `${getStorageEndpoint()}/${encodeURIComponent(env.BUNNY_STORAGE_ZONE)}/${encodeStorageKey(key)}`;
}

function getDirectoryUrl(key: string) {
  const normalizedKey = normalizeMediaKey(key) ?? '';
  const directory = normalizedKey.includes('/') ? normalizedKey.slice(0, normalizedKey.lastIndexOf('/') + 1) : '';
  const encodedDirectory = directory ? directory.split('/').filter(Boolean).map(encodeURIComponent).join('/') + '/' : '';
  return `${getStorageEndpoint()}/${encodeURIComponent(env.BUNNY_STORAGE_ZONE)}/${encodedDirectory}`;
}

function toNodeReadable(body: ReadableStream<Uint8Array> | null) {
  if (!body) return undefined;
  return Readable.fromWeb(body as never);
}

async function assertOk(response: Response, action: string) {
  if (response.ok) return;
  const text = await response.text().catch(() => '');
  throw new Error(`Bunny Storage ${action} failed (${response.status}): ${text || response.statusText}`);
}

function contentTypeForKey(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.vtt')) return 'text/vtt';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.apk')) return 'application/vnd.android.package-archive';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.avi')) return 'video/x-msvideo';
  return lower.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream';
}

export function hasConfiguredBunnyStorage() {
  return Boolean(
    env.BUNNY_STORAGE_API_KEY?.trim() &&
      env.BUNNY_STORAGE_ZONE?.trim() &&
      env.BUNNY_STORAGE_ENDPOINT?.trim()
  );
}

export function createStorageUploadToken(payload: UploadTokenPayload) {
  if (!env.ACE_STREAM_SIGNING_SECRET) {
    throw new Error('ACE_STREAM_SIGNING_SECRET is required to sign storage uploads.');
  }

  return jwt.sign(payload, env.ACE_STREAM_SIGNING_SECRET, { expiresIn: UPLOAD_TOKEN_TTL });
}

export function verifyStorageUploadToken(token: string): UploadTokenPayload {
  if (!env.ACE_STREAM_SIGNING_SECRET) {
    throw new Error('ACE_STREAM_SIGNING_SECRET is required to verify storage uploads.');
  }

  return jwt.verify(token, env.ACE_STREAM_SIGNING_SECRET) as UploadTokenPayload;
}

export function createStorageUploadUrl(key: string, contentType: string) {
  const token = createStorageUploadToken({ key, contentType });
  return `/api/uploads/bunny?token=${encodeURIComponent(token)}`;
}

export function createSignedStorageUrl(
  key: string,
  options: {
    expiresIn?: number;
    directoryToken?: boolean;
    pathStyleToken?: boolean;
  } = {}
) {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) {
    throw new Error('Storage key is required.');
  }

  if (!env.BUNNY_CDN_HOSTNAME || !env.BUNNY_TOKEN_KEY) {
    throw new Error('Bunny CDN signing is not configured. Set BUNNY_CDN_HOSTNAME and BUNNY_TOKEN_KEY.');
  }

  const encodedPath = `/${normalizedKey.split('/').map(encodeURIComponent).join('/')}`;
  const expires = Math.floor(Date.now() / 1000) + (options.expiresIn ?? 60 * 60);
  const params = new URLSearchParams();

  let signaturePath = encodedPath;
  if (options.directoryToken) {
    const directoryPath = encodedPath.slice(0, encodedPath.lastIndexOf('/') + 1);
    signaturePath = directoryPath;
    params.set('token_path', directoryPath);
  }

  const signingData = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join('&');

  const token = crypto
    .createHmac('sha256', env.BUNNY_TOKEN_KEY)
    .update(`${signaturePath}${expires}${signingData}`)
    .digest('base64url');

  params.set('token', `HS256-${token}`);
  params.set('expires', String(expires));

  const baseHostname = env.BUNNY_CDN_HOSTNAME.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  if (options.pathStyleToken && options.directoryToken) {
    const tokenValue = params.get('token');
    const expiresValue = params.get('expires');
    const tokenPathValue = params.get('token_path');

    if (!tokenValue || !expiresValue || !tokenPathValue) {
      throw new Error('Unable to create Bunny path-style directory token.');
    }

    return `https://${baseHostname}/bcdn_token=${encodeURIComponent(tokenValue)}&expires=${encodeURIComponent(expiresValue)}&token_path=${encodeURIComponent(tokenPathValue)}${encodedPath}`;
  }

  return `https://${baseHostname}${encodedPath}?${params.toString()}`;
}

export async function putObject(
  key: string,
  body: Buffer | Uint8Array | ReadableStream<Uint8Array>,
  contentType: string
) {
  requireBunnyStorageConfig();
  const requestInit: RequestInit & { duplex?: 'half' } = {
    method: 'PUT',
    headers: {
      AccessKey: env.BUNNY_STORAGE_API_KEY,
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: body as BodyInit
  };

  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    requestInit.duplex = 'half';
  }

  const response = await fetch(getStorageUrl(key), requestInit);
  await assertOk(response, 'upload');
  objectMetadataCache.delete(`${env.BUNNY_STORAGE_ZONE}:${normalizeMediaKey(key)}`);
}

export async function deleteObject(key: string) {
  requireBunnyStorageConfig();
  const response = await fetch(getStorageUrl(key), {
    method: 'DELETE',
    headers: { AccessKey: env.BUNNY_STORAGE_API_KEY }
  });
  await assertOk(response, 'delete');
  objectMetadataCache.delete(`${env.BUNNY_STORAGE_ZONE}:${normalizeMediaKey(key)}`);
}

async function getMetadataFromHeaders(key: string, response: Response): Promise<StoredObjectMetadata> {
  const contentLength = Number(response.headers.get('content-length') ?? '');
  return {
    ContentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    ContentType: response.headers.get('content-type') ?? contentTypeForKey(key),
    LastModified: response.headers.get('last-modified') ? new Date(response.headers.get('last-modified') as string) : undefined
  };
}

async function getMetadataFromDirectoryListing(key: string): Promise<StoredObjectMetadata> {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) throw new Error('Storage key is required.');

  const fileName = normalizedKey.split('/').pop();
  const response = await fetch(getDirectoryUrl(normalizedKey), {
    method: 'GET',
    headers: { AccessKey: env.BUNNY_STORAGE_API_KEY }
  });
  await assertOk(response, 'list');

  const rows = await response.json().catch(() => []) as Array<Record<string, unknown>>;
  const row = rows.find((item) => item.ObjectName === fileName || item.Path === normalizedKey || item.FullPath === normalizedKey);
  if (!row) {
    throw new Error(`Bunny Storage object not found: ${normalizedKey}`);
  }

  const length = Number(row.Length ?? row.Size ?? 0);
  const dateValue = typeof row.LastChanged === 'string'
    ? row.LastChanged
    : typeof row.DateCreated === 'string'
      ? row.DateCreated
      : undefined;

  return {
    ContentLength: Number.isFinite(length) ? length : undefined,
    ContentType: typeof row.ContentType === 'string' ? row.ContentType : contentTypeForKey(normalizedKey),
    LastModified: dateValue ? new Date(dateValue) : undefined
  };
}

export async function headObject(key: string): Promise<StoredObjectMetadata> {
  requireBunnyStorageConfig();

  const headResponse = await fetch(getStorageUrl(key), {
    method: 'HEAD',
    headers: { AccessKey: env.BUNNY_STORAGE_API_KEY }
  });

  if (headResponse.ok) {
    return getMetadataFromHeaders(key, headResponse);
  }

  return getMetadataFromDirectoryListing(key);
}

export async function getObjectMetadata(key: string): Promise<StoredObjectMetadata> {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) throw new Error('Storage key is required.');

  const cacheKey = `${env.BUNNY_STORAGE_ZONE}:${normalizedKey}`;
  const now = Date.now();
  const cached = objectMetadataCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = headObject(normalizedKey).catch((error) => {
    objectMetadataCache.delete(cacheKey);
    throw error;
  });

  objectMetadataCache.set(cacheKey, {
    expiresAt: now + OBJECT_METADATA_TTL_MS,
    promise
  });

  return promise;
}

export async function getObjectStream(key: string, range?: string): Promise<StoredObjectResponse> {
  requireBunnyStorageConfig();
  const response = await fetch(getStorageUrl(key), {
    method: 'GET',
    headers: {
      AccessKey: env.BUNNY_STORAGE_API_KEY,
      ...(range ? { Range: range } : {})
    }
  });
  await assertOk(response, 'download');

  const contentLength = Number(response.headers.get('content-length') ?? '');
  return {
    Body: toNodeReadable(response.body),
    ContentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    ContentType: response.headers.get('content-type') ?? contentTypeForKey(key),
    ContentRange: response.headers.get('content-range') ?? undefined
  };
}

export async function getObjectBuffer(key: string) {
  requireBunnyStorageConfig();
  const response = await fetch(getStorageUrl(key), {
    method: 'GET',
    headers: { AccessKey: env.BUNNY_STORAGE_API_KEY }
  });
  await assertOk(response, 'download');

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? contentTypeForKey(key)
  };
}
