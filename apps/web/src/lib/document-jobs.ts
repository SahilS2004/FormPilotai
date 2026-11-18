import { DocumentJob, DocumentJobDocType, DocumentJobStatus, PersonaTone } from '@formpilot/shared';
import { withDatabase } from './db';

const memoryJobs = new Map<string, DocumentJob>();

function mapRow(row: Record<string, unknown>): DocumentJob {
  return {
    id: String(row.id),
    status: String(row.status) as DocumentJobStatus,
    docType: String(row.doc_type || row.docType) as DocumentJobDocType,
    title: String(row.title || ''),
    company: String(row.company || ''),
    role: String(row.role || ''),
    formHeading: String(row.form_heading || row.formHeading || ''),
    formUrl: String(row.form_url || row.formUrl || ''),
    tone: (String(row.tone || 'professional') as PersonaTone) || 'professional',
    fieldId: row.field_id || row.fieldId ? String(row.field_id || row.fieldId) : undefined,
    draftText: row.draft_text || row.draftText ? String(row.draft_text || row.draftText) : undefined,
    draftFilename: row.draft_filename || row.draftFilename ? String(row.draft_filename || row.draftFilename) : undefined,
    draftMime: row.draft_mime || row.draftMime ? String(row.draft_mime || row.draftMime) : undefined,
    draftBase64: row.draft_base64 || row.draftBase64 ? String(row.draft_base64 || row.draftBase64) : undefined,
    documentId: row.document_id || row.documentId ? String(row.document_id || row.documentId) : undefined,
    error: row.error ? String(row.error) : undefined,
    createdAt: new Date(String(row.created_at || row.createdAt)).toISOString(),
    updatedAt: new Date(String(row.updated_at || row.updatedAt)).toISOString(),
  };
}

export async function createDocumentJob(input: {
  docType: DocumentJobDocType;
  title: string;
  company?: string;
  role?: string;
  formHeading?: string;
  formUrl?: string;
  tone?: PersonaTone;
  fieldId?: string;
}): Promise<DocumentJob> {
  const now = new Date().toISOString();
  const job: DocumentJob = {
    id: `djob_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: 'queued',
    docType: input.docType || 'cover_letter',
    title: input.title.trim() || 'Cover Letter',
    company: (input.company || '').trim(),
    role: (input.role || '').trim(),
    formHeading: (input.formHeading || '').trim(),
    formUrl: (input.formUrl || '').trim(),
    tone: input.tone || 'professional',
    fieldId: input.fieldId,
    createdAt: now,
    updatedAt: now,
  };

  const pool = await withDatabase();
  if (!pool) {
    memoryJobs.set(job.id, job);
    return job;
  }

  await pool.query(
    `INSERT INTO document_jobs (
       id, status, doc_type, title, company, role, form_heading, form_url, tone, field_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
    [
      job.id, job.status, job.docType, job.title, job.company, job.role,
      job.formHeading, job.formUrl, job.tone, job.fieldId || null, now,
    ]
  );
  return job;
}

export async function getDocumentJob(id: string): Promise<DocumentJob | null> {
  const pool = await withDatabase();
  if (!pool) return memoryJobs.get(id) || null;
  const res = await pool.query(`SELECT * FROM document_jobs WHERE id = $1 LIMIT 1`, [id]);
  if (!res.rows[0]) return memoryJobs.get(id) || null;
  return mapRow(res.rows[0]);
}

export async function updateDocumentJob(
  id: string,
  patch: Partial<Omit<DocumentJob, 'id' | 'createdAt'>>
): Promise<DocumentJob | null> {
  const existing = await getDocumentJob(id);
  if (!existing) return null;
  const next: DocumentJob = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const pool = await withDatabase();
  if (!pool) {
    memoryJobs.set(id, next);
    return next;
  }

  await pool.query(
    `UPDATE document_jobs SET
       status = $2,
       draft_text = $3,
       draft_filename = $4,
       draft_mime = $5,
       draft_base64 = $6,
       document_id = $7,
       error = $8,
       updated_at = $9
     WHERE id = $1`,
    [
      id,
      next.status,
      next.draftText || null,
      next.draftFilename || null,
      next.draftMime || null,
      next.draftBase64 || null,
      next.documentId || null,
      next.error || null,
      next.updatedAt,
    ]
  );
  memoryJobs.set(id, next);
  return next;
}

/** Public poll payload — never returns the full base64 while generating. */
export function publicDocumentJob(job: DocumentJob, includeDraft = false) {
  return {
    id: job.id,
    status: job.status,
    docType: job.docType,
    title: job.title,
    company: job.company,
    role: job.role,
    formHeading: job.formHeading,
    formUrl: job.formUrl,
    tone: job.tone,
    fieldId: job.fieldId,
    documentId: job.documentId,
    error: job.error,
    draftFilename: job.draftFilename,
    draftMime: job.draftMime,
    draftText: includeDraft ? job.draftText : undefined,
    draftBase64: includeDraft && job.status === 'ready' ? job.draftBase64 : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
