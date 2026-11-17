/** Read at process start. Bracket access keeps Next.js from baking the value into the image. */
export function runtimeEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

const production = runtimeEnv('NODE_ENV') === 'production';

/**
 * Local defaults match docker-compose (Postgres + LocalStack).
 * On AWS, either DATABASE_URL or the DB_* pieces from Secrets Manager are set,
 * and S3 uses the task role with no endpoint and no static keys.
 */
export function resolveDatabaseUrl(): string | null {
  if (runtimeEnv('DATABASE_URL')) return runtimeEnv('DATABASE_URL') as string;
  const host = runtimeEnv('DB_HOST');
  const user = runtimeEnv('DB_USER');
  const password = runtimeEnv('DB_PASSWORD');
  if (host && user && password) {
    const port = runtimeEnv('DB_PORT') || '5432';
    const name = runtimeEnv('DB_NAME') || 'formpilot';
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
  }
  if (production) return null;
  return 'postgresql://formpilot:formpilot_secure_pass_2026@127.0.0.1:5432/formpilot_db';
}

export function databaseSsl(): { rejectUnauthorized: false } | undefined {
  const url = resolveDatabaseUrl() || '';
  if (runtimeEnv('DB_SSL') === 'true' || url.includes('rds.amazonaws.com')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export const objectStorageConfig = {
  endpoint: runtimeEnv('S3_ENDPOINT') || (production ? undefined : 'http://127.0.0.1:4566'),
  region: runtimeEnv('AWS_REGION') || 'us-east-1',
  bucket: runtimeEnv('S3_BUCKET') || 'formpilot-kb',
  accessKeyId: runtimeEnv('S3_ACCESS_KEY_ID') || runtimeEnv('AWS_ACCESS_KEY_ID') || (production ? '' : 'test'),
  secretAccessKey: runtimeEnv('S3_SECRET_ACCESS_KEY') || runtimeEnv('AWS_SECRET_ACCESS_KEY') || (production ? '' : 'test'),
  forcePathStyle: runtimeEnv('S3_FORCE_PATH_STYLE')
    ? runtimeEnv('S3_FORCE_PATH_STYLE') !== 'false'
    : Boolean(runtimeEnv('S3_ENDPOINT') || !production),
};
