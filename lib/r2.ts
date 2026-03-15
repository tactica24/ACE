import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

const client = new S3Client({
  region: env.R2_REGION,
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY
  }
});

export async function headObject(key: string) {
  return client.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export async function getObjectStream(key: string) {
  return client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  return client.send(
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function createPresignedPutUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function createPresignedGetUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 900 });
}


