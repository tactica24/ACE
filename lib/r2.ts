import { Readable } from 'node:stream';
import {
  S3Client,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

const OBJECT_METADATA_TTL_MS = 1000 * 60 * 10;

let r2Client: S3Client | null = null;
const objectMetadataCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<HeadObjectCommandOutput>;
  }
>();

function createClient() {
  if (!r2Client) {
    r2Client = new S3Client({
      region: env.R2_REGION,
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    });
  }

  return r2Client;
}

function getBucket() {
  return env.R2_BUCKET;
}

export async function headObject(key: string): Promise<HeadObjectCommandOutput> {
  return createClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
}

export async function getObjectMetadata(key: string): Promise<HeadObjectCommandOutput> {
  const now = Date.now();
  const cached = objectMetadataCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = headObject(key).catch((error) => {
    objectMetadataCache.delete(key);
    throw error;
  });

  objectMetadataCache.set(key, {
    expiresAt: now + OBJECT_METADATA_TTL_MS,
    promise
  });

  return promise;
}

export async function getObjectStream(key: string, range?: string): Promise<GetObjectCommandOutput> {
  return createClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key, Range: range }));
}

async function streamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getObjectBuffer(key: string) {
  const response = await getObjectStream(key);
  if (!response.Body) {
    throw new Error('Missing R2 object body');
  }

  const body = response.Body as
    | (Readable & { transformToByteArray?: () => Promise<Uint8Array> })
    | Buffer
    | Uint8Array;

  let buffer: Buffer;
  if (Buffer.isBuffer(body)) {
    buffer = body;
  } else if (body instanceof Uint8Array) {
    buffer = Buffer.from(body);
  } else if (typeof body.transformToByteArray === 'function') {
    buffer = Buffer.from(await body.transformToByteArray());
  } else {
    buffer = await streamToBuffer(body);
  }

  return {
    buffer,
    contentType: response.ContentType ?? 'application/octet-stream'
  };
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  return createClient().send(
    new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType })
  );
}

export async function createPresignedPutUrl(key: string, contentType: string) {
  const client = createClient();
  const command = new PutObjectCommand({ Bucket: getBucket(), Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function createPresignedGetUrl(key: string) {
  const client = createClient();
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: key });
  return getSignedUrl(client, command, { expiresIn: 900 });
}
