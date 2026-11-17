import { Pool } from 'pg';
import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  PersonaTone, 
  AgentPromptConfig 
} from '@formpilot/shared';
import { resolveDatabaseUrl } from './env';
import { ensureDatabaseSchema } from './schema';
import { 
  documentsStore, 
  documentContentsStore, 
  remindersStore, 
  bulkJobsStore, 
  historyStore, 
  promptConfigStore,
  notificationStore
} from './store';

// =========================================================================
// PostgreSQL Connection Pool Setup
// =========================================================================

let pool: Pool | null = null;
let isConnectedCache: boolean | null = null;
let lastCheckTime = 0;

export function getDbPool(): Pool | null {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 2500,
      idleTimeoutMillis: 15000,
      max: 10,
    });
    pool.on('error', (err) => {
      console.warn('[PostgreSQL Pool Warning]', err.message);
    });
  }
  return pool;
}

export async function checkPostgresHealth(): Promise<boolean> {
  const now = Date.now();
  if (isConnectedCache !== null && now - lastCheckTime < 15000) {
    return isConnectedCache;
  }

  const p = getDbPool();
  if (!p) {
    isConnectedCache = false;
    lastCheckTime = now;
    return false;
  }

  try {
    const res = await p.query('SELECT 1 as healthy');
    isConnectedCache = res.rows?.[0]?.healthy === 1;
  } catch {
    isConnectedCache = false;
  }

  lastCheckTime = now;
  return isConnectedCache;
}

export async function withDatabase(): Promise<Pool | null> {
  const healthy = await checkPostgresHealth();
  const active = getDbPool();
  if (!healthy || !active) return null;
  await ensureDatabaseSchema(active);
  return active;
}

// =========================================================================
// 1. Documents API
// =========================================================================

function mapDocumentRow(row: Record<string, unknown>): KBDocument {
  return {
    id: String(row.id),
    name: String(row.name),
    originalFilename: String(row.originalFilename),
    mimeType: String(row.mimeType),
    sizeBytes: Number(row.sizeBytes),
    description: String(row.description || ''),
    isEnabled: Boolean(row.isEnabled),
    createdAt: new Date(String(row.createdAt)).toISOString(),
    updatedAt: new Date(String(row.updatedAt)).toISOString(),
    s3Bucket: row.s3Bucket ? String(row.s3Bucket) : undefined,
    s3Key: row.s3Key ? String(row.s3Key) : undefined,
    storageDriver: row.s3Bucket === 'local-disk' ? 'disk' : row.s3Bucket ? 's3' : undefined,
    sourceType: (row.sourceType as KBDocument['sourceType']) || 'file',
    sourceUrl: row.sourceUrl ? String(row.sourceUrl) : undefined,
    indexStatus: (row.indexStatus as KBDocument['indexStatus']) || undefined,
    chunkCount: row.chunkCount == null ? undefined : Number(row.chunkCount),
  };
}

export async function fetchAllDocuments(): Promise<KBDocument[]> {
  const active = await withDatabase();
  if (!active) return documentsStore;

  try {
    const res = await active.query(
      `SELECT id, name, original_filename as "originalFilename", mime_type as "mimeType", 
              size_bytes as "sizeBytes", description, is_enabled as "isEnabled", 
              s3_bucket as "s3Bucket", s3_key as "s3Key", source_type as "sourceType",
              source_url as "sourceUrl", index_status as "indexStatus", chunk_count as "chunkCount",
              created_at as "createdAt", updated_at as "updatedAt" 
       FROM documents 
       ORDER BY created_at DESC`
    );
    return (res.rows || []).map(mapDocumentRow);
  } catch (err) {
    console.warn('[DB fetchAllDocuments fallback]', err);
  }
  return documentsStore;
}

export async function createDocumentRecord(doc: KBDocument, contentText?: string): Promise<KBDocument> {
  const rememberLocally = () => {
    const existing = documentsStore.findIndex((item) => item.id === doc.id);
    if (existing >= 0) documentsStore.splice(existing, 1);
    documentsStore.unshift(doc);
    if (contentText) documentContentsStore.set(doc.id, contentText);
  };

  const active = await withDatabase();
  if (!active) {
    rememberLocally();
    return doc;
  }

  try {
    await active.query(
      `INSERT INTO documents (
         id, name, original_filename, mime_type, size_bytes, description, is_enabled,
         content_text, file_data_base64, s3_bucket, s3_key, source_type, source_url,
         index_status, chunk_count, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        doc.id,
        doc.name,
        doc.originalFilename,
        doc.mimeType,
        doc.sizeBytes,
        doc.description,
        doc.isEnabled,
        contentText || doc.description,
        doc.s3Bucket || null,
        doc.s3Key || null,
        doc.sourceType || 'file',
        doc.sourceUrl || null,
        doc.indexStatus || 'pending',
        doc.chunkCount || 0,
        doc.createdAt,
        doc.updatedAt
      ]
    );
  } catch (err) {
    console.warn('[DB createDocumentRecord fallback]', err);
    rememberLocally();
  }
  return doc;
}

export async function markDocumentIndexed(id: string, chunkCount: number, status: 'indexed' | 'failed'): Promise<void> {
  const active = await withDatabase();
  const local = documentsStore.find((doc) => doc.id === id);
  if (local) {
    local.chunkCount = chunkCount;
    local.indexStatus = status;
    local.updatedAt = new Date().toISOString();
  }
  if (!active) return;
  await active.query(
    `UPDATE documents SET chunk_count = $2, index_status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id, chunkCount, status]
  );
}

export async function updateDocumentFields(id: string, fields: { isEnabled?: boolean; description?: string }): Promise<void> {
  const active = await withDatabase();
  const local = documentsStore.find((doc) => doc.id === id);
  if (local) {
    if (typeof fields.isEnabled === 'boolean') local.isEnabled = fields.isEnabled;
    if (typeof fields.description === 'string') local.description = fields.description;
  }
  if (!active) return;
  if (typeof fields.isEnabled === 'boolean') {
    await active.query(
      `UPDATE documents SET is_enabled = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, fields.isEnabled]
    );
  }
  if (typeof fields.description === 'string') {
    await active.query(
      `UPDATE documents SET description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, fields.description]
    );
  }
}

export async function getDocumentStorage(id: string): Promise<{ bucket?: string; key?: string } | null> {
  const active = await withDatabase();
  if (!active) {
    const local = documentsStore.find((doc) => doc.id === id);
    return local ? { bucket: local.s3Bucket, key: local.s3Key } : null;
  }
  const res = await active.query(`SELECT s3_bucket, s3_key FROM documents WHERE id = $1`, [id]);
  if (!res.rows[0]) return null;
  return { bucket: res.rows[0].s3_bucket || undefined, key: res.rows[0].s3_key || undefined };
}

export async function fetchDocumentFilePayload(documentId: string): Promise<{
  originalFilename: string;
  mimeType: string;
  fileBase64?: string;
  contentText?: string;
} | null> {
  const active = await withDatabase();

  if (active) {
    try {
      const res = await active.query(
        `SELECT original_filename, mime_type, file_data_base64, content_text, s3_bucket, s3_key
         FROM documents WHERE id = $1 LIMIT 1`,
        [documentId]
      );
      if (res.rows?.[0]) {
        let fileBase64 = res.rows[0].file_data_base64 || undefined;
        if (!fileBase64 && res.rows[0].s3_key) {
          const { getKbObject } = await import('./object-store');
          const bytes = await getKbObject(res.rows[0].s3_bucket, res.rows[0].s3_key);
          if (bytes) fileBase64 = bytes.toString('base64');
        }
        return {
          originalFilename: res.rows[0].original_filename,
          mimeType: res.rows[0].mime_type,
          fileBase64,
          contentText: res.rows[0].content_text || undefined
        };
      }
    } catch (err) {
      console.warn('[fetchDocumentFilePayload DB Error]', err);
    }
  }

  const doc = documentsStore.find(d => d.id === documentId);
  if (doc) {
    return {
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      contentText: documentContentsStore.get(doc.id) || doc.description
    };
  }
  return null;
}

export async function toggleDocumentScope(id: string): Promise<boolean> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    const target = documentsStore.find(d => d.id === id);
    if (target) {
      target.isEnabled = !target.isEnabled;
      return target.isEnabled;
    }
    return false;
  }

  try {
    const res = await pool.query(
      `UPDATE documents 
       SET is_enabled = NOT is_enabled, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING is_enabled`,
      [id]
    );
    return res.rows?.[0]?.is_enabled ?? false;
  } catch {
    const target = documentsStore.find(d => d.id === id);
    if (target) target.isEnabled = !target.isEnabled;
    return target?.isEnabled ?? false;
  }
}

// =========================================================================
// 2. Reminders API
// =========================================================================

function mapReminderRow(row: Record<string, any>): FormReminder {
  return {
    id: row.id,
    websiteUrl: row.websiteUrl,
    domain: row.domain,
    title: row.title,
    deadlineTimestamp: new Date(row.deadlineTimestamp).toISOString(),
    reminderWindowMinutes: Number(row.reminderWindowMinutes),
    autoActionPolicy: row.autoActionPolicy,
    minConfidenceThreshold: Number(row.minConfidenceThreshold),
    status: row.status,
    tone: row.tone,
    notes: row.notes || '',
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    executedAt: row.executedAt ? new Date(row.executedAt).toISOString() : undefined,
    executionLog: row.executionLog || undefined,
  };
}

export async function fetchAllReminders(): Promise<FormReminder[]> {
  const active = await withDatabase();
  if (!active) return [...remindersStore];

  try {
    const res = await active.query(
      `SELECT id, website_url as "websiteUrl", domain, title, deadline_timestamp as "deadlineTimestamp",
              reminder_window_minutes as "reminderWindowMinutes", auto_action_policy as "autoActionPolicy",
              min_confidence_threshold as "minConfidenceThreshold", status, tone, notes,
              execution_log as "executionLog", executed_at as "executedAt",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM reminders
       ORDER BY deadline_timestamp ASC`
    );
    return (res.rows || []).map(mapReminderRow);
  } catch (err) {
    console.warn('[DB fetchAllReminders fallback]', err);
  }
  return [...remindersStore];
}

export async function createReminderRecord(rem: FormReminder): Promise<FormReminder> {
  const active = await withDatabase();
  if (!active) {
    remindersStore.unshift(rem);
    return rem;
  }

  try {
    await active.query(
      `INSERT INTO reminders (id, website_url, domain, title, deadline_timestamp, reminder_window_minutes, auto_action_policy, min_confidence_threshold, status, tone, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        rem.id,
        rem.websiteUrl,
        rem.domain,
        rem.title,
        rem.deadlineTimestamp,
        rem.reminderWindowMinutes,
        rem.autoActionPolicy,
        rem.minConfidenceThreshold,
        rem.status,
        rem.tone,
        rem.notes || '',
        rem.createdAt,
        rem.updatedAt
      ]
    );
  } catch (err) {
    console.warn('[DB createReminderRecord fallback]', err);
    remindersStore.unshift(rem);
  }
  return rem;
}

export interface ReminderPatch {
  status?: FormReminder['status'];
  executionLog?: string;
  executedAt?: string | null;
  claim?: boolean;
}

export async function updateReminderRecord(id: string, patch: ReminderPatch): Promise<FormReminder | null> {
  const active = await withDatabase();
  if (!active) {
    const local = remindersStore.find((item) => item.id === id);
    if (!local) return null;
    if (patch.claim) {
      if (local.executionLog) return null;
      local.executionLog = 'claimed';
    }
    if (patch.status) local.status = patch.status;
    if (patch.executionLog && !patch.claim) local.executionLog = patch.executionLog;
    if (patch.executedAt) local.executedAt = patch.executedAt;
    local.updatedAt = new Date().toISOString();
    return local;
  }

  if (patch.claim) {
    const claimed = await active.query(
      `UPDATE reminders
       SET execution_log = 'claimed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status = 'auto_action_in_progress'
         AND (execution_log IS NULL OR execution_log = '')
       RETURNING id`,
      [id]
    );
    if (!claimed.rows[0]) return null;
  }

  const sets: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: unknown[] = [id];
  if (patch.status) {
    values.push(patch.status);
    sets.push(`status = $${values.length}`);
  }
  if (patch.executionLog && !patch.claim) {
    values.push(patch.executionLog);
    sets.push(`execution_log = $${values.length}`);
  }
  if (patch.executedAt) {
    values.push(patch.executedAt);
    sets.push(`executed_at = $${values.length}`);
  }
  if (sets.length > 1) {
    await active.query(`UPDATE reminders SET ${sets.join(', ')} WHERE id = $1`, values);
  }

  const res = await active.query(
    `SELECT id, website_url as "websiteUrl", domain, title, deadline_timestamp as "deadlineTimestamp",
            reminder_window_minutes as "reminderWindowMinutes", auto_action_policy as "autoActionPolicy",
            min_confidence_threshold as "minConfidenceThreshold", status, tone, notes,
            execution_log as "executionLog", executed_at as "executedAt",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM reminders WHERE id = $1`,
    [id]
  );
  return res.rows[0] ? mapReminderRow(res.rows[0]) : null;
}

export interface AppNotification {
  id: string;
  reminderId?: string;
  title: string;
  body: string;
  href?: string;
  isRead: boolean;
  createdAt: string;
}

export async function createNotification(input: Omit<AppNotification, 'isRead' | 'createdAt'>): Promise<AppNotification> {
  const row: AppNotification = {
    ...input,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  const active = await withDatabase();
  if (!active) {
    notificationStore.unshift(row);
    return row;
  }
  await active.query(
    `INSERT INTO notifications (id, reminder_id, title, body, href, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, false, $6)`,
    [row.id, row.reminderId || null, row.title, row.body, row.href || null, row.createdAt]
  );
  return row;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const active = await withDatabase();
  if (!active) return notificationStore;
  const res = await active.query(
    `SELECT id, reminder_id as "reminderId", title, body, href, is_read as "isRead", created_at as "createdAt"
     FROM notifications
     ORDER BY created_at DESC
     LIMIT 20`
  );
  return res.rows.map((row) => ({
    ...row,
    isRead: Boolean(row.isRead),
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}

export async function claimDueReminders(): Promise<FormReminder[]> {
  const active = await withDatabase();
  const now = Date.now();

  if (!active) {
    const due = remindersStore.filter((rem) => {
      if (rem.status !== 'pending') return false;
      const trigger = new Date(rem.deadlineTimestamp).getTime() - rem.reminderWindowMinutes * 60_000;
      return trigger <= now;
    });
    for (const rem of due) {
      rem.status = 'auto_action_in_progress';
      rem.updatedAt = new Date().toISOString();
      rem.executionLog = '';
    }
    return due;
  }

  const res = await active.query(
    `WITH due AS (
       SELECT id FROM reminders
       WHERE status = 'pending'
         AND deadline_timestamp <= NOW() + (reminder_window_minutes * INTERVAL '1 minute')
       FOR UPDATE SKIP LOCKED
     )
     UPDATE reminders AS reminder
     SET status = 'auto_action_in_progress',
         execution_log = NULL,
         updated_at = CURRENT_TIMESTAMP
     FROM due
     WHERE reminder.id = due.id
     RETURNING reminder.id, reminder.website_url as "websiteUrl", reminder.domain, reminder.title,
               reminder.deadline_timestamp as "deadlineTimestamp",
               reminder.reminder_window_minutes as "reminderWindowMinutes",
               reminder.auto_action_policy as "autoActionPolicy",
               reminder.min_confidence_threshold as "minConfidenceThreshold",
               reminder.status, reminder.tone, reminder.notes,
               reminder.execution_log as "executionLog", reminder.executed_at as "executedAt",
               reminder.created_at as "createdAt", reminder.updated_at as "updatedAt"`
  );
  return (res.rows || []).map(mapReminderRow);
}

export async function fetchActionableReminders(): Promise<FormReminder[]> {
  const active = await withDatabase();
  if (!active) {
    return remindersStore.filter((rem) =>
      rem.status === 'auto_action_in_progress' &&
      rem.autoActionPolicy !== 'notify_only' &&
      !rem.executionLog
    );
  }
  const res = await active.query(
    `SELECT id, website_url as "websiteUrl", domain, title, deadline_timestamp as "deadlineTimestamp",
            reminder_window_minutes as "reminderWindowMinutes", auto_action_policy as "autoActionPolicy",
            min_confidence_threshold as "minConfidenceThreshold", status, tone, notes,
            execution_log as "executionLog", executed_at as "executedAt",
            created_at as "createdAt", updated_at as "updatedAt"
     FROM reminders
     WHERE status = 'auto_action_in_progress'
       AND auto_action_policy IN ('auto_fill_draft', 'auto_submit')
       AND (execution_log IS NULL OR execution_log = '')
     ORDER BY deadline_timestamp ASC`
  );
  return (res.rows || []).map(mapReminderRow);
}

// =========================================================================
// 3. Bulk Multi-Site Jobs API
// =========================================================================

export async function fetchAllBulkJobs(): Promise<BulkFormJob[]> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return bulkJobsStore;
  }

  try {
    const jobsRes = await pool.query(
      `SELECT id, name, status, auto_submit as "autoSubmit", tone, total_count as "totalCount", 
              completed_count as "completedCount", failed_count as "failedCount",
              created_at as "createdAt", completed_at as "completedAt"
       FROM bulk_jobs
       ORDER BY created_at DESC`
    );

    const itemsRes = await pool.query(
      `SELECT id, job_id as "jobId", url, domain, status, form_title as "formTitle", 
              filled_fields_count as "filledFieldsCount", total_fields_count as "totalFieldsCount", 
              average_confidence as "averageConfidence", error
       FROM bulk_job_items`
    );

    const itemsByJob = new Map<string, any[]>();
    for (const item of itemsRes.rows) {
      const list = itemsByJob.get(item.jobId) || [];
      list.push({
        ...item,
        averageConfidence: Number(item.averageConfidence)
      });
      itemsByJob.set(item.jobId, list);
    }

    if (jobsRes.rows && jobsRes.rows.length > 0) {
      return jobsRes.rows.map(job => ({
        ...job,
        activeDocIds: ['doc_1', 'doc_2'],
        urls: itemsByJob.get(job.id) || [],
        createdAt: new Date(job.createdAt).toISOString(),
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : undefined
      }));
    }
  } catch (err) {
    console.warn('[DB fetchAllBulkJobs fallback]', err);
  }
  return bulkJobsStore;
}

export async function createBulkJobRecord(job: BulkFormJob): Promise<BulkFormJob> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    bulkJobsStore.unshift(job);
    return job;
  }

  try {
    await pool.query(
      `INSERT INTO bulk_jobs (id, name, status, auto_submit, tone, total_count, completed_count, failed_count, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        job.id,
        job.name,
        job.status,
        job.autoSubmit,
        job.tone,
        job.totalCount,
        job.completedCount,
        job.failedCount,
        job.createdAt,
        job.completedAt || null
      ]
    );

    for (const item of job.urls) {
      await pool.query(
        `INSERT INTO bulk_job_items (id, job_id, url, domain, status, form_title, filled_fields_count, total_fields_count, average_confidence, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          item.id,
          job.id,
          item.url,
          item.domain,
          item.status,
          item.formTitle || '',
          item.filledFieldsCount || 0,
          item.totalFieldsCount || 0,
          item.averageConfidence || 0,
          item.error || null
        ]
      );
    }
  } catch (err) {
    console.warn('[DB createBulkJobRecord fallback]', err);
    bulkJobsStore.unshift(job);
  }
  return job;
}

// =========================================================================
// 4. Form History & Audit Trail API
// =========================================================================

export async function fetchAllHistory(): Promise<FormFillHistoryRecord[]> {
  const active = await withDatabase();
  if (!active) return historyStore;

  try {
    const res = await active.query(
      `SELECT id, domain, url, form_title as "formTitle", submitted_at as "submittedAt",
              tone, total_fields_count as "totalFieldsCount", filled_fields_count as "filledFieldsCount",
              was_auto_submitted as "wasAutoSubmitted", fields_payload as "fields"
       FROM form_history
       WHERE is_submitted = true
       ORDER BY submitted_at DESC`
    );
    return (res.rows || []).map((row) => ({
      ...row,
      submittedAt: new Date(row.submittedAt).toISOString(),
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : (row.fields || []),
    }));
  } catch (err) {
    console.warn('[DB fetchAllHistory fallback]', err);
    return historyStore;
  }
}

export async function fetchHistoryById(id: string): Promise<FormFillHistoryRecord | null> {
  const active = await withDatabase();
  if (!active) return historyStore.find((item) => item.id === id) || null;

  try {
    const res = await active.query(
      `SELECT id, domain, url, form_title as "formTitle", submitted_at as "submittedAt",
              tone, total_fields_count as "totalFieldsCount", filled_fields_count as "filledFieldsCount",
              was_auto_submitted as "wasAutoSubmitted", fields_payload as "fields"
       FROM form_history
       WHERE id = $1 AND is_submitted = true
       LIMIT 1`,
      [id]
    );
    const row = res.rows?.[0];
    if (!row) return null;
    return {
      ...row,
      submittedAt: new Date(row.submittedAt).toISOString(),
      fields: typeof row.fields === 'string' ? JSON.parse(row.fields) : (row.fields || []),
    };
  } catch (err) {
    console.warn('[DB fetchHistoryById fallback]', err);
    return historyStore.find((item) => item.id === id) || null;
  }
}

export async function createHistoryRecord(record: FormFillHistoryRecord): Promise<FormFillHistoryRecord> {
  const active = await withDatabase();
  if (!active) {
    historyStore.unshift(record);
    return record;
  }

  try {
    const recent = await active.query(
      `SELECT id FROM form_history
       WHERE url = $1 AND is_submitted = true AND submitted_at > NOW() - INTERVAL '20 seconds'
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [record.url]
    );
    if (recent.rows?.[0]?.id) {
      const existing = await fetchHistoryById(recent.rows[0].id);
      if (existing) return existing;
    }

    await active.query(
      `INSERT INTO form_history (id, domain, url, form_title, submitted_at, tone, total_fields_count, filled_fields_count, was_auto_submitted, is_submitted, fields_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10)`,
      [
        record.id,
        record.domain,
        record.url,
        record.formTitle,
        record.submittedAt,
        record.tone,
        record.totalFieldsCount,
        record.filledFieldsCount,
        record.wasAutoSubmitted,
        JSON.stringify(record.fields)
      ]
    );
  } catch (err) {
    console.warn('[DB createHistoryRecord fallback]', err);
    historyStore.unshift(record);
  }
  return record;
}

// =========================================================================
// 5. System Settings & Onboarding Progress
// =========================================================================

export async function fetchSystemSettings(): Promise<AgentPromptConfig> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return promptConfigStore;
  }

  try {
    const res = await pool.query(
      `SELECT tone, custom_prompt_addons as "customPromptAddons", user_context as "userContext"
       FROM system_settings
       WHERE id = 'default'`
    );
    if (res.rows?.[0]) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn('[DB fetchSystemSettings fallback]', err);
  }
  return promptConfigStore;
}

export async function updateSystemSettings(config: AgentPromptConfig): Promise<AgentPromptConfig> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    promptConfigStore.tone = config.tone;
    promptConfigStore.customPromptAddons = config.customPromptAddons;
    return promptConfigStore;
  }

  try {
    await pool.query(
      `INSERT INTO system_settings (id, tone, custom_prompt_addons, updated_at)
       VALUES ('default', $1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE 
       SET tone = EXCLUDED.tone, custom_prompt_addons = EXCLUDED.custom_prompt_addons, updated_at = CURRENT_TIMESTAMP`,
      [config.tone, config.customPromptAddons || '']
    );
  } catch (err) {
    console.warn('[DB updateSystemSettings fallback]', err);
    promptConfigStore.tone = config.tone;
    promptConfigStore.customPromptAddons = config.customPromptAddons;
  }
  return config;
}

export async function fetchOnboardingProgress(): Promise<{ completedSteps: string[]; isTourCompleted: boolean }> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return { completedSteps: ['kb'], isTourCompleted: false };
  }

  try {
    const res = await pool.query(
      `SELECT completed_steps as "completedSteps", is_tour_completed as "isTourCompleted"
       FROM onboarding_progress
       WHERE id = 'default_user'`
    );
    if (res.rows?.[0]) {
      return {
        completedSteps: res.rows[0].completedSteps || [],
        isTourCompleted: res.rows[0].isTourCompleted || false
      };
    }
  } catch (err) {
    console.warn('[DB fetchOnboardingProgress fallback]', err);
  }
  return { completedSteps: ['kb'], isTourCompleted: false };
}

export async function saveOnboardingStep(stepKey: string): Promise<string[]> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return [stepKey];
  }

  try {
    const res = await pool.query(
      `INSERT INTO onboarding_progress (id, completed_steps, updated_at)
       VALUES ('default_user', ARRAY[$1]::text[], CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE
       SET completed_steps = array_append(
         array_remove(onboarding_progress.completed_steps, $1), $1
       ), updated_at = CURRENT_TIMESTAMP
       RETURNING completed_steps as "completedSteps"`,
      [stepKey]
    );
    return res.rows?.[0]?.completedSteps || [stepKey];
  } catch (err) {
    console.warn('[DB saveOnboardingStep fallback]', err);
    return [stepKey];
  }
}
