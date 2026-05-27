import { Readable } from 'node:stream';
import {
  S3Client,
  GetObjectCommand,
  type GetObjectCommandOutput,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type HeadObjectCommandOutput,
  CopyObjectCommand
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

function getBucket(bucketName?: string) {
  return bucketName?.trim() || env.R2_BUCKET;
}

export function getMasterBucket() {
  const bucket = env.MASTER_R2_BUCKET?.trim();
  if (!bucket) {
    throw new Error('MASTER_R2_BUCKET environment variable is required but not set. Please configure your master file bucket in the environment variables.');
  }
  return bucket;
}

export function isMasterStorageKey(key?: string | null): boolean {
  if (!key) return false;
  const normalized = key.trim().toLowerCase();
  return normalized.includes('/master/');
}

export function getBucketForStorageKey(key?: string | null, explicitBucket?: string): string | undefined {
  if (explicitBucket) return explicitBucket;
  if (isMasterStorageKey(key)) {
    try {
      return getMasterBucket();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function headObject(key: string, bucketName?: string): Promise<HeadObjectCommandOutput> {
  return createClient().send(new HeadObjectCommand({ Bucket: getBucket(bucketName), Key: key }));
}

export async function getObjectMetadata(key: string, bucketName?: string): Promise<HeadObjectCommandOutput> {
  const cacheKey = `${bucketName || env.R2_BUCKET}:${key}`;
  const now = Date.now();
  const cached = objectMetadataCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = headObject(key, bucketName).catch((error) => {
    objectMetadataCache.delete(cacheKey);
    throw error;
  });

  objectMetadataCache.set(cacheKey, {
    expiresAt: now + OBJECT_METADATA_TTL_MS,
    promise
  });

  return promise;
}

export async function getObjectStream(key: string, range?: string, bucketName?: string): Promise<GetObjectCommandOutput> {
  return createClient().send(new GetObjectCommand({ Bucket: getBucket(bucketName), Key: key, Range: range }));
}

async function streamToBuffer(stream: Readable) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function getObjectBuffer(key: string, bucketName?: string) {
  const response = await getObjectStream(key, undefined, bucketName);
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

export async function putObject(key: string, body: Buffer | Uint8Array, contentType: string, bucketName?: string) {
  return createClient().send(
    new PutObjectCommand({ Bucket: getBucket(bucketName), Key: key, Body: body, ContentType: contentType })
  );
}

export async function deleteObject(key: string, bucketName?: string) {
  return createClient().send(new DeleteObjectCommand({ Bucket: getBucket(bucketName), Key: key }));
}

export async function copyObject(sourceKey: string, destinationKey: string, sourceBucket?: string, destBucket?: string) {
  const client = createClient();
  const sourceBucketName = getBucket(sourceBucket);
  const destBucketName = getBucket(destBucket);

  await client.send(
    new CopyObjectCommand({
      Bucket: destBucketName,
      CopySource: `${sourceBucketName}/${encodeURIComponent(sourceKey)}`,
      Key: destinationKey
    })
  );
}

export async function createPresignedPutUrl(key: string, contentType: string, bucketName?: string) {
  const client = createClient();
  const command = new PutObjectCommand({ Bucket: getBucket(bucketName), Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function createMultipartUpload(key: string, contentType: string, bucketName?: string) {
  const response = await createClient().send(
    new CreateMultipartUploadCommand({ Bucket: getBucket(bucketName), Key: key, ContentType: contentType })
  );

  if (!response.UploadId) {
    throw new Error('Unable to start multipart upload.');
  }

  return response.UploadId;
}

export async function createPresignedUploadPartUrl({
  key,
  uploadId,
  partNumber,
  bucketName
}: {
  key: string;
  uploadId: string;
  partNumber: number;
  bucketName?: string;
}) {
  const command = new UploadPartCommand({
    Bucket: getBucket(bucketName),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  });
  return getSignedUrl(createClient(), command, { expiresIn: 900 });
}

export async function completeMultipartUpload({
  key,
  uploadId,
  parts,
  bucketName
}: {
  key: string;
  uploadId: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
  bucketName?: string;
}) {
  return createClient().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucket(bucketName),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts }
    })
  );
}

export async function abortMultipartUpload(key: string, uploadId: string, bucketName?: string) {
  return createClient().send(
    new AbortMultipartUploadCommand({ Bucket: getBucket(bucketName), Key: key, UploadId: uploadId })
  );
}

export async function createPresignedGetUrl(
  key: string,
  options?: {
    contentDisposition?: string;
    contentType?: string;
  },
  bucketName?: string
) {
  const client = createClient();
  const command = new GetObjectCommand({
    Bucket: getBucket(bucketName),
    Key: key,
    ResponseContentDisposition: options?.contentDisposition,
    ResponseContentType: options?.contentType
  });
  return getSignedUrl(client, command, { expiresIn: 900 });
}
