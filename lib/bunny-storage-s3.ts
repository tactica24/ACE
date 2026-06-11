import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';
import { normalizeMediaKey } from './media';
import {
  MULTIPART_UPLOAD_PART_SIZE_BYTES,
  MULTIPART_UPLOAD_THRESHOLD_BYTES,
  type CompletedMultipartUploadPart,
  type PreparedStorageUpload,
  type PreparedStorageUploadMultipart
} from './storage-upload';

const SIGNED_UPLOAD_TTL_SECONDS = 60 * 60;

async function getPresignedS3Url(command: PutObjectCommand | UploadPartCommand) {
  const client = getBunnyStorageS3Client();
  return getSignedUrl(client as never, command as never, {
    expiresIn: SIGNED_UPLOAD_TTL_SECONDS
  });
}

function getNormalizedS3Key(key: string) {
  const normalizedKey = normalizeMediaKey(key);
  if (!normalizedKey) {
    throw new Error('Storage key is required.');
  }
  return normalizedKey;
}

export function hasConfiguredBunnyStorageS3() {
  return Boolean(
    env.BUNNY_STORAGE_S3_ENDPOINT?.trim() &&
      env.BUNNY_STORAGE_ZONE?.trim() &&
      env.BUNNY_STORAGE_API_KEY?.trim()
  );
}

function requireBunnyStorageS3Config() {
  if (!hasConfiguredBunnyStorageS3()) {
    throw new Error(
      'Bunny S3 storage is not configured. Set BUNNY_STORAGE_S3_ENDPOINT, BUNNY_STORAGE_ZONE, and BUNNY_STORAGE_API_KEY.'
    );
  }
}

function getBunnyStorageS3Client() {
  requireBunnyStorageS3Config();

  return new S3Client({
    region: 'auto',
    endpoint: env.BUNNY_STORAGE_S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.BUNNY_STORAGE_ZONE,
      secretAccessKey: env.BUNNY_STORAGE_API_KEY
    }
  });
}

function getBunnyStorageBucket() {
  if (!env.BUNNY_STORAGE_ZONE?.trim()) {
    throw new Error('BUNNY_STORAGE_ZONE is required for Bunny S3 uploads.');
  }

  return env.BUNNY_STORAGE_ZONE;
}

export async function createStorageUploadTarget(
  key: string,
  contentType: string,
  fileSize: number
): Promise<PreparedStorageUpload> {
  const normalizedKey = getNormalizedS3Key(key);

  if (!hasConfiguredBunnyStorageS3()) {
    throw new Error('Bunny S3 storage is not configured for direct uploads.');
  }

  if (Number.isFinite(fileSize) && fileSize > MULTIPART_UPLOAD_THRESHOLD_BYTES) {
    return createMultipartStorageUpload(normalizedKey, contentType, fileSize);
  }

  const url = await getPresignedS3Url(
    new PutObjectCommand({
      Bucket: getBunnyStorageBucket(),
      Key: normalizedKey,
      ContentType: contentType || 'application/octet-stream'
    })
  );

  return {
    strategy: 'single',
    key: normalizedKey,
    contentType,
    url
  };
}

export async function createMultipartStorageUpload(
  key: string,
  contentType: string,
  fileSize: number
): Promise<PreparedStorageUploadMultipart> {
  const normalizedKey = getNormalizedS3Key(key);
  const client = getBunnyStorageS3Client();
  const bucket = getBunnyStorageBucket();

  const created = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: normalizedKey,
      ContentType: contentType || 'application/octet-stream'
    })
  );

  if (!created.UploadId) {
    throw new Error('Bunny S3 did not return an upload id for multipart upload.');
  }

  const partSize = MULTIPART_UPLOAD_PART_SIZE_BYTES;
  const partCount = Math.max(1, Math.ceil(fileSize / partSize));
  const urls = await Promise.all(
    Array.from({ length: partCount }, async (_item, index) => {
      const partNumber = index + 1;
      const url = await getPresignedS3Url(
        new UploadPartCommand({
          Bucket: bucket,
          Key: normalizedKey,
          UploadId: created.UploadId,
          PartNumber: partNumber
        })
      );

      return {
        partNumber,
        url
      };
    })
  );

  return {
    strategy: 'multipart',
    key: normalizedKey,
    contentType,
    uploadId: created.UploadId,
    partSize,
    urls
  };
}

export async function completeMultipartStorageUpload(input: {
  key: string;
  uploadId: string;
  parts: CompletedMultipartUploadPart[];
}) {
  const client = getBunnyStorageS3Client();
  const bucket = getBunnyStorageBucket();
  const key = getNormalizedS3Key(input.key);

  const parts = [...input.parts]
    .filter((part) => part.partNumber > 0 && part.etag.trim())
    .sort((left, right) => left.partNumber - right.partNumber)
    .map((part) => ({
      ETag: part.etag,
      PartNumber: part.partNumber
    }));

  if (!parts.length) {
    throw new Error('At least one uploaded part is required to complete multipart upload.');
  }

  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: parts
      }
    })
  );
}

export async function abortMultipartStorageUpload(input: { key: string; uploadId: string }) {
  const client = getBunnyStorageS3Client();
  const bucket = getBunnyStorageBucket();

  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: getNormalizedS3Key(input.key),
      UploadId: input.uploadId
    })
  );
}

export async function assertStorageObjectExistsViaS3(key: string) {
  const client = getBunnyStorageS3Client();
  const bucket = getBunnyStorageBucket();

  await client.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: getNormalizedS3Key(key)
    })
  );
}
