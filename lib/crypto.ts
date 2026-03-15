import crypto from 'crypto';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { pipeline } from 'stream/promises';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export function generateAceKey() {
  return crypto.randomBytes(32);
}

export function wrapKey(key: Buffer, masterSecret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(masterSecret).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(key), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function unwrapKey(payload: string, masterSecret: string) {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, 12);
  const tag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(masterSecret).digest(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function encryptFile(inputPath: string, outputPath: string, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const outStream = fs.createWriteStream(outputPath, { flags: 'w' });
  outStream.write(iv);

  await pipeline(fs.createReadStream(inputPath), cipher, outStream);

  const tag = cipher.getAuthTag();
  await fsPromises.appendFile(outputPath, tag);
}

export async function decryptFile(inputPath: string, outputPath: string, key: Buffer) {
  const stat = await fsPromises.stat(inputPath);
  const totalSize = stat.size;
  if (totalSize <= IV_LENGTH + TAG_LENGTH) throw new Error('Invalid ace file');

  const fd = await fsPromises.open(inputPath, 'r');
  const iv = Buffer.alloc(IV_LENGTH);
  await fd.read(iv, 0, IV_LENGTH, 0);
  const tag = Buffer.alloc(TAG_LENGTH);
  await fd.read(tag, 0, TAG_LENGTH, totalSize - TAG_LENGTH);
  await fd.close();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const start = IV_LENGTH;
  const end = totalSize - TAG_LENGTH - 1;
  await pipeline(fs.createReadStream(inputPath, { start, end }), decipher, fs.createWriteStream(outputPath, { flags: 'w' }));
}


