import { Pool } from 'pg';
import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  PersonaTone, 
  AgentPromptConfig 
} from '@formpilot/shared';
import { 
  documentsStore, 
  documentContentsStore, 
  remindersStore, 
  bulkJobsStore, 
  historyStore, 
  promptConfigStore 
} from './store';

// =========================================================================
// PostgreSQL Connection Pool Setup
// =========================================================================

let pool: Pool | null = null;
let isConnectedCache: boolean | null = null;
let lastCheckTime = 0;

export function getDbPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
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

// =========================================================================
// 1. Documents API
// =========================================================================

export async function fetchAllDocuments(): Promise<KBDocument[]> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return documentsStore;
  }

  try {
    const res = await pool.query(
      `SELECT id, name, original_filename as "originalFilename", mime_type as "mimeType", 
              size_bytes as "sizeBytes", description, is_enabled as "isEnabled", 
              created_at as "createdAt", updated_at as "updatedAt" 
       FROM documents 
       ORDER BY created_at DESC`
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        sizeBytes: Number(r.sizeBytes),
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString()
      }));
    }
  } catch (err) {
    console.warn('[DB fetchAllDocuments fallback]', err);
  }
  return documentsStore;
}

export async function createDocumentRecord(doc: KBDocument, contentText?: string): Promise<KBDocument> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    documentsStore.unshift(doc);
    if (contentText) {
      documentContentsStore.set(doc.id, contentText);
    }
    return doc;
  }

  try {
    await pool.query(
      `INSERT INTO documents (id, name, original_filename, mime_type, size_bytes, description, is_enabled, content_text, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        doc.id,
        doc.name,
        doc.originalFilename,
        doc.mimeType,
        doc.sizeBytes,
        doc.description,
        doc.isEnabled,
        contentText || doc.description,
        doc.createdAt,
        doc.updatedAt
      ]
    );
  } catch (err) {
    console.warn('[DB createDocumentRecord fallback]', err);
    documentsStore.unshift(doc);
    if (contentText) {
      documentContentsStore.set(doc.id, contentText);
    }
  }
  return doc;
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

export async function fetchAllReminders(): Promise<FormReminder[]> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return remindersStore;
  }

  try {
    const res = await pool.query(
      `SELECT id, website_url as "websiteUrl", domain, title, deadline_timestamp as "deadlineTimestamp",
              reminder_window_minutes as "reminderWindowMinutes", auto_action_policy as "autoActionPolicy",
              min_confidence_threshold as "minConfidenceThreshold", status, tone, notes,
              created_at as "createdAt", updated_at as "updatedAt"
       FROM reminders
       ORDER BY deadline_timestamp ASC`
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        minConfidenceThreshold: Number(r.minConfidenceThreshold),
        deadlineTimestamp: new Date(r.deadlineTimestamp).toISOString(),
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString()
      }));
    }
  } catch (err) {
    console.warn('[DB fetchAllReminders fallback]', err);
  }
  return remindersStore;
}

export async function createReminderRecord(rem: FormReminder): Promise<FormReminder> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    remindersStore.unshift(rem);
    return rem;
  }

  try {
    await pool.query(
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
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    return historyStore;
  }

  try {
    const res = await pool.query(
      `SELECT id, domain, url, form_title as "formTitle", submitted_at as "submittedAt",
              tone, total_fields_count as "totalFieldsCount", filled_fields_count as "filledFieldsCount",
              was_auto_submitted as "wasAutoSubmitted", fields_payload as "fields"
       FROM form_history
       ORDER BY submitted_at DESC`
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows.map(r => ({
        ...r,
        submittedAt: new Date(r.submittedAt).toISOString()
      }));
    }
  } catch (err) {
    console.warn('[DB fetchAllHistory fallback]', err);
  }
  return historyStore;
}

export async function createHistoryRecord(record: FormFillHistoryRecord): Promise<FormFillHistoryRecord> {
  const isHealthy = await checkPostgresHealth();
  if (!isHealthy || !pool) {
    historyStore.unshift(record);
    return record;
  }

  try {
    await pool.query(
      `INSERT INTO form_history (id, domain, url, form_title, submitted_at, tone, total_fields_count, filled_fields_count, was_auto_submitted, fields_payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
