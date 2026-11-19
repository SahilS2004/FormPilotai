import { readFileSync } from 'fs';
import path from 'path';
import type { Pool } from 'pg';
import { embeddingDimension } from './gemini';

let migrated = false;

function initSql(): string {
  const candidates = [
    path.join(process.cwd(), 'docker/init.sql'),
    path.join(process.cwd(), '../../docker/init.sql'),
  ];
  for (const file of candidates) {
    try {
      return readFileSync(file, 'utf8').replace(/vector\(\d+\)/g, `vector(${embeddingDimension()})`);
    } catch {
      continue;
    }
  }
  throw new Error('docker/init.sql was not found. The database schema cannot be created.');
}

function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/**
 * Creates the schema on a fresh RDS database and widens the vector column
 * when an older local MiniLM index (384 dimensions) is still present.
 */
export async function ensureDatabaseSchema(pool: Pool): Promise<void> {
  if (migrated) return;

  for (const sql of statements(initSql())) {
    await pool.query(sql);
  }

  const alters = [
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(128)`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key TEXT`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'file'`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS index_status VARCHAR(32) DEFAULT 'pending'`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INT DEFAULT 0`,
    `ALTER TABLE reminders ADD COLUMN IF NOT EXISTS execution_log TEXT`,
    `ALTER TABLE reminders ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE form_history ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE document_jobs ALTER COLUMN title TYPE TEXT`,
    `ALTER TABLE document_jobs ALTER COLUMN company TYPE TEXT`,
    `ALTER TABLE document_jobs ALTER COLUMN role TYPE TEXT`,
  ];
  for (const sql of alters) {
    await pool.query(sql);
  }

  const dimension = await pool.query(
    `SELECT format_type(a.atttypid, a.atttypmod) AS type
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'document_chunks' AND a.attname = 'embedding'`
  );
  const current = String(dimension.rows?.[0]?.type || '');
  const expected = `vector(${embeddingDimension()})`;
  if (current && current !== expected) {
    await pool.query('DROP INDEX IF EXISTS document_chunks_embedding_hnsw');
    await pool.query('ALTER TABLE document_chunks DROP COLUMN embedding');
    await pool.query(`ALTER TABLE document_chunks ADD COLUMN embedding ${expected}`);
    await pool.query(`UPDATE documents SET index_status = 'pending', chunk_count = 0`);
  }

  try {
    await pool.query(
      `CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
       ON document_chunks USING hnsw (embedding vector_cosine_ops)`
    );
  } catch (err) {
    console.warn('[schema] vector index skipped', err);
  }

  migrated = true;
}
