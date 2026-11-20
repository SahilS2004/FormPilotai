import { BulkFormItem, FormSchema, PersonaTone } from '@formpilot/shared';
import { POST as fillForm } from '@/app/api/fill-form/route';
import { createHistoryRecord, fetchAllBulkJobs, saveBulkProgress, updateBulkItem } from '@/lib/db';
import { readFormPage } from '@/lib/page-form';

function answersFrom(schema: FormSchema, predictions: Array<{ fieldId: string; value?: string; confidence?: number; filePayload?: { fileName?: string } }>, gaps: Array<{ canGenerate?: boolean; missingDocumentName?: string; fieldId?: string }>) {
  const byId = new Map(predictions.map((item) => [item.fieldId, item]));
  const answers: { question: string; answer: string }[] = [];
  for (const field of schema.fields) {
    const prediction = byId.get(field.id);
    const fileName = prediction?.filePayload?.fileName;
    const value = String(prediction?.value || fileName || '').trim();
    if (!value) continue;
    answers.push({ question: field.label || field.name || field.id, answer: value });
  }
  for (const gap of gaps) {
    if (!gap.canGenerate) continue;
    const question = gap.missingDocumentName || 'Document';
    if (answers.some((item) => item.question === question)) continue;
    answers.push({
      question,
      answer: 'Not in the knowledge base. Open this form in the browser to generate it.',
    });
  }
  const scored = predictions.filter((item) => String(item.value || item.filePayload?.fileName || '').trim());
  const confidence = scored.length
    ? scored.reduce((sum, item) => sum + (item.confidence || 0), 0) / scored.length
    : 0;
  return { answers, confidence };
}

async function fillSchema(schema: FormSchema, tone: PersonaTone, activeDocIds: string[]) {
  const response = await fillForm(new Request('http://internal/api/fill-form', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      schema,
      tone,
      activeDocIds: activeDocIds.length > 0 ? activeDocIds : undefined,
    }),
  }));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Fill failed (${response.status})`);
  }
  return data as {
    predictions?: Array<{ fieldId: string; value?: string; confidence?: number; filePayload?: { fileName?: string } }>;
    gapRecommendations?: Array<{ canGenerate?: boolean; missingDocumentName?: string; fieldId?: string }>;
  };
}

/** Visits each queued form, fills it from the knowledge base, and stores the answers. */
export async function runBulkJob(jobId: string): Promise<void> {
  const job = (await fetchAllBulkJobs()).find((item) => item.id === jobId);
  if (!job) return;

  let completed = 0;
  let failed = 0;
  for (const item of job.urls) {
    const outcome = await runOne(item, job.tone, job.activeDocIds || [], job.autoSubmit);
    if (outcome === 'failed') failed += 1;
    else completed += 1;
    await saveBulkProgress(job.id, {
      status: 'running',
      completedCount: completed,
      failedCount: failed,
    });
  }

  await saveBulkProgress(job.id, {
    status: failed === 0 ? 'completed' : 'partially_failed',
    completedCount: completed,
    failedCount: failed,
    completedAt: new Date().toISOString(),
  });
}

async function runOne(item: BulkFormItem, tone: PersonaTone, activeDocIds: string[], autoSubmit: boolean): Promise<'filled' | 'failed'> {
  try {
    await updateBulkItem(item.id, { status: 'scanning', error: undefined, answers: [] });
    const schema = await readFormPage(item.url);
    if (schema.fields.length === 0) {
      await updateBulkItem(item.id, {
        status: 'failed',
        formTitle: schema.title,
        totalFieldsCount: 0,
        filledFieldsCount: 0,
        averageConfidence: 0,
        error: 'No form fields were found on this page.',
        answers: [],
      });
      return 'failed';
    }

    await updateBulkItem(item.id, {
      status: 'processing',
      formTitle: schema.title,
      totalFieldsCount: schema.fields.length,
    });
    const filled = await fillSchema(schema, tone, activeDocIds);
    const { answers, confidence } = answersFrom(schema, filled.predictions || [], filled.gapRecommendations || []);
    if (answers.length === 0) {
      await updateBulkItem(item.id, {
        status: 'failed',
        formTitle: schema.title,
        totalFieldsCount: schema.fields.length,
        filledFieldsCount: 0,
        averageConfidence: 0,
        error: 'The knowledge base had no answers for this form.',
        answers: [],
      });
      return 'failed';
    }

    const canSubmit = autoSubmit && confidence >= 0.9;
    let resultHistoryId: string | undefined;
    if (canSubmit) {
      const record = await createHistoryRecord({
        id: `hist_${Date.now()}_${item.id.slice(-6)}`,
        domain: item.domain,
        url: item.url,
        formTitle: schema.title.slice(0, 240),
        submittedAt: new Date().toISOString(),
        tone,
        totalFieldsCount: schema.fields.length,
        filledFieldsCount: answers.length,
        wasAutoSubmitted: true,
        fields: answers.map((answer) => ({
          fieldId: answer.question,
          question: answer.question,
          answer: answer.answer,
          confidence,
          wasEditedByUser: false,
        })),
      });
      resultHistoryId = record.id;
    }

    await updateBulkItem(item.id, {
      status: canSubmit ? 'submitted' : 'filled',
      formTitle: schema.title,
      totalFieldsCount: schema.fields.length,
      filledFieldsCount: answers.length,
      averageConfidence: Math.round(confidence * 100) / 100,
      error: undefined,
      answers,
      resultHistoryId,
    });
    return 'filled';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The fleet could not fill this form.';
    await updateBulkItem(item.id, {
      status: 'failed',
      error: message.slice(0, 500),
      answers: [],
    }).catch(() => {});
    return 'failed';
  }
}
