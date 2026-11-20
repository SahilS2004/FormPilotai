import type { Pool } from 'pg';

let migrated = false;

/**
 * Adds columns introduced after the first docker init.
 * Safe to run on every boot: every statement is idempotent.
 */
export async function ensureDatabaseSchema(pool: Pool): Promise<void> {
  if (migrated) return;

  const statements = [
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(128)`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS s3_key TEXT`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'file'`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_url TEXT`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS index_status VARCHAR(32) DEFAULT 'pending'`,
    `ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INT DEFAULT 0`,
    `ALTER TABLE reminders ADD COLUMN IF NOT EXISTS execution_log TEXT`,
    `ALTER TABLE reminders ADD COLUMN IF NOT EXISTS executed_at TIMESTAMP WITH TIME ZONE`,
    `ALTER TABLE form_history ADD COLUMN IF NOT EXISTS is_submitted BOOLEAN NOT NULL DEFAULT false`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(64) PRIMARY KEY,
      reminder_id VARCHAR(64),
      title VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      href TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of statements) {
    await pool.query(sql);
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
