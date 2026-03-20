import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

function createClient() {
  return new S3Client({
    region: env.R2_REGION,
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY
    }
  });
}

function getBucket() {
  return env.R2_BUCKET;
}

export async function headObject(key: string) {
  return createClient().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
}

export async function getObjectStream(key: string) {
  return createClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
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
