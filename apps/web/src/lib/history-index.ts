import { FormFillHistoryRecord } from '@formpilot/shared';
import { fetchAllHistory, markDocumentIndexed, withDatabase } from './db';
import { storeDocumentVectors } from './vector';

const indexedIds = new Set<string>();
let backfill: Promise<void> | null = null;

export function historyDocumentId(historyId: string): string {
  return `history_${historyId}`;
}

const SENSITIVE_QUESTION = /password|passcode|otp|cvv|cvc|card number|ssn|social security|captcha/i;

function historyLines(record: FormFillHistoryRecord): Array<{ question: string; answer: string }> {
  const lines: Array<{ question: string; answer: string }> = [];
  for (const field of record.fields || []) {
    const question = String(field.question || '').replace(/[*]+/g, ' ').replace(/\s+/g, ' ').trim();
    const answer = String(field.answer || '').replace(/\s+/g, ' ').trim();
    if (!question || !answer || SENSITIVE_QUESTION.test(question)) continue;
    if (/^(true|false|on|off)$/i.test(answer)) continue;
    lines.push({ question, answer: answer.slice(0, 600) });
  }
  return lines;
}

/** Questions and answers only. The site, link, and page title of the old form are left out. */
export function renderHistoryText(record: FormFillHistoryRecord): string {
  return historyLines(record).map((line) => `${line.question}: ${line.answer}`).join('\n');
}

/** Every past answer, newest first, one line per distinct question. */
export async function pastFormAnswers(limit = 80): Promise<string[]> {
  const records = await fetchAllHistory();
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const record of records) {
    for (const line of historyLines(record)) {
      const key = line.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      lines.push(`${line.question}: ${line.answer}`);
      if (lines.length >= limit) return lines;
    }
  }
  return lines;
}

export async function indexHistoryRecord(record: FormFillHistoryRecord): Promise<void> {
  const text = renderHistoryText(record);
  if (!record.id || !text) return;
  const id = historyDocumentId(record.id);
  const name = 'Previous form answers';
  const now = record.submittedAt || new Date().toISOString();
  const active = await withDatabase();
  if (active) {
    const existing = await active.query(
      `SELECT content_text, name, index_status FROM documents WHERE id = $1`,
      [id]
    );
    const row = existing.rows[0];
    if (row && row.content_text === text && row.name === name && row.index_status === 'indexed') {
      indexedIds.add(id);
      return;
    }
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
      [id, name, `${id}.txt`, text.length, 'Answers the user submitted on an earlier form.', text, now]
    );
  }
  const stored = await storeDocumentVectors({
    documentId: id,
    documentName: name,
    contentText: text,
    metadata: { docType: 'history' },
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
