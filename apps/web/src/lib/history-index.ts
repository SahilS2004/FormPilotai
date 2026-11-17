import { FormFillHistoryRecord } from '@formpilot/shared';
import { fetchAllHistory, markDocumentIndexed, withDatabase } from './db';
import { storeDocumentVectors } from './vector';

const indexedIds = new Set<string>();
let backfill: Promise<void> | null = null;

export function historyDocumentId(historyId: string): string {
  return `history_${historyId}`;
}

export function submittedFormDocIds(): string[] {
  return Array.from(indexedIds);
}

export function renderHistoryText(record: FormFillHistoryRecord): string {
  const lines = [
    `Submitted form: ${record.formTitle || 'Web form'}`,
    record.url ? `Website: ${record.url}` : '',
  ];
  for (const field of record.fields || []) {
    const question = String(field.question || '').replace(/[*]+/g, ' ').replace(/\s+/g, ' ').trim();
    const answer = String(field.answer || '').replace(/\s+/g, ' ').trim();
    if (!question || !answer) continue;
    if (/password|passcode|cvv|cvc|card number|ssn|social security/i.test(question)) continue;
    lines.push(`${question}: ${answer}`);
  }
  return lines.filter(Boolean).join('\n');
}

export async function indexHistoryRecord(record: FormFillHistoryRecord): Promise<void> {
  const text = renderHistoryText(record);
  if (!record.id || text.split('\n').length < 2) return;
  const id = historyDocumentId(record.id);
  const name = (record.formTitle || 'Submitted form').slice(0, 180);
  const now = record.submittedAt || new Date().toISOString();
  const active = await withDatabase();
  if (active) {
    await active.query(
      `INSERT INTO documents (
         id, name, original_filename, mime_type, size_bytes, description, is_enabled,
         content_text, source_type, index_status, chunk_count, created_at, updated_at
       ) VALUES ($1, $2, $3, 'text/plain', $4, $5, true, $6, 'history', 'pending', 0, $7, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         content_text = EXCLUDED.content_text,
         size_bytes = EXCLUDED.size_bytes,
         source_type = 'history',
         is_enabled = true,
         updated_at = CURRENT_TIMESTAMP`,
      [id, name, `${id}.txt`, text.length, `Answers submitted on ${record.domain || 'a website'}.`, text, now]
    );
  }
  const stored = await storeDocumentVectors({
    documentId: id,
    documentName: name,
    contentText: text,
    metadata: { docType: 'history', url: record.url },
  });
  await markDocumentIndexed(id, stored.chunksStored, 'indexed');
  indexedIds.add(id);
}

export function ensureSubmittedFormsIndexed(): Promise<void> {
  if (!backfill) {
    backfill = (async () => {
      const records = await fetchAllHistory();
      for (const record of records) {
        if (indexedIds.has(historyDocumentId(record.id))) continue;
        await indexHistoryRecord(record);
      }
    })().catch((error) => {
      backfill = null;
      throw error;
    });
  }
  return backfill;
}
