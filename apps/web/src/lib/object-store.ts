import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { objectStorageConfig } from './env';

export type StorageDriver = 's3' | 'disk';

export interface StoredObject {
  bucket: string;
  key: string;
  driver: StorageDriver;
}

let client: S3Client | null = null;
let bucketReady = false;
let preferDisk = false;

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: objectStorageConfig.region,
      endpoint: objectStorageConfig.endpoint,
      forcePathStyle: objectStorageConfig.forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: objectStorageConfig.accessKeyId,
        secretAccessKey: objectStorageConfig.secretAccessKey,
      },
    });
  }
  return client;
}

function diskPath(key: string): string {
  return path.join(process.cwd(), '.data', 'objects', key);
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: objectStorageConfig.bucket }));
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket: objectStorageConfig.bucket }));
  }
  bucketReady = true;
}

export async function putKbObject(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
  if (!preferDisk) {
    try {
      await ensureBucket();
      await s3().send(new PutObjectCommand({
        Bucket: objectStorageConfig.bucket,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      }));
      return { bucket: objectStorageConfig.bucket, key, driver: 's3' };
    } catch (err) {
      console.warn('[object-store] S3 put failed, writing to local disk', err);
      preferDisk = true;
      bucketReady = false;
    }
  }

  const full = diskPath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return { bucket: 'local-disk', key, driver: 'disk' };
}

export async function getKbObject(bucket: string, key: string): Promise<Buffer | null> {
  if (bucket === 'local-disk') {
    try {
      return await readFile(diskPath(key));
    } catch {
      return null;
    }
  }

  try {
    const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch (err) {
    console.warn('[object-store] S3 get failed', err);
    return null;
  }
}

export async function deleteKbObject(bucket: string | undefined, key: string | undefined): Promise<void> {
  if (!key) return;
  if (!bucket || bucket === 'local-disk') {
    await unlink(diskPath(key)).catch(() => {});
    return;
  }
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.warn('[object-store] S3 delete failed', err);
  }
}

export function buildObjectKey(documentId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180) || 'document';
  return `kb/${documentId}/${safe}`;
}
