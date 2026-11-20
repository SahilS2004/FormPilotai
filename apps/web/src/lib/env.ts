/**
 * Local defaults match docker-compose (Postgres + MinIO).
 * Production must set DATABASE_URL and the S3 / AWS variables.
 */
export function resolveDatabaseUrl(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') return null;
  return 'postgresql://formpilot:formpilot_secure_pass_2026@127.0.0.1:5432/formpilot_db';
}

export const objectStorageConfig = {
  endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:4566',
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET || 'formpilot-kb',
  accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || 'test',
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
};
