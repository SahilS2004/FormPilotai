import { DocumentRecommendation, FormSchema, PredictedFieldValue } from '@formpilot/shared';
import { apiFetch } from './api';

type BuilderResult = {
  accepted: number;
  rejected: number;
  failed: number;
  predictions: PredictedFieldValue[];
};

const POLL_MS = 10_000;
const MAX_WAIT_MS = 3 * 60_000;

function valueByLabel(predictions: PredictedFieldValue[], schema: FormSchema, pattern: RegExp): string {
  for (const pred of predictions) {
    const field = schema.fields.find((item) => item.id === pred.fieldId);
    const label = `${field?.label || ''} ${field?.name || ''}`.toLowerCase();
    if (!pattern.test(label)) continue;
    const value = String(pred.value || '').trim();
    if (value) return value;
  }
  return '';
}

function ensureOverlayStyles() {
  if (document.getElementById('formpilot-doc-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'formpilot-doc-overlay-styles';
  style.textContent = `
    #formpilot-doc-overlay {
      position: fixed; inset: 0; z-index: 2147483646;
      display: flex; align-items: center; justify-content: center;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
    }
    #formpilot-doc-overlay .fp-card {
      width: min(420px, calc(100vw - 32px));
      background: #fff; color: #0f172a; border-radius: 16px;
      padding: 24px; box-shadow: 0 24px 80px rgba(2, 8, 23, 0.35);
    }
    #formpilot-doc-overlay h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    #formpilot-doc-overlay p { margin: 0 0 16px; font-size: 14px; line-height: 1.45; color: #475569; }
    #formpilot-doc-overlay .fp-spinner {
      width: 28px; height: 28px; border-radius: 50%;
      border: 3px solid #e2e8f0; border-top-color: #0f766e;
      animation: fp-spin 0.8s linear infinite; margin: 8px auto 16px;
    }
    @keyframes fp-spin { to { transform: rotate(360deg); } }
    #formpilot-doc-overlay .fp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    #formpilot-doc-overlay button {
      border: 0; border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    #formpilot-doc-overlay .fp-preview { background: #e2e8f0; color: #0f172a; }
    #formpilot-doc-overlay .fp-accept { background: #0f766e; color: #fff; }
    #formpilot-doc-overlay .fp-reject { background: #fff; color: #b91c1c; border: 1px solid #fecaca; }
    #formpilot-doc-overlay .fp-error { color: #b91c1c; }
  `;
  document.head.appendChild(style);
}

function mountOverlay(docName: string) {
  ensureOverlayStyles();
  document.getElementById('formpilot-doc-overlay')?.remove();
  const root = document.createElement('div');
  root.id = 'formpilot-doc-overlay';
  root.innerHTML = `
    <div class="fp-card" role="dialog" aria-live="polite" aria-label="Document builder">
      <h2>Form needs ${escapeHtml(docName)}</h2>
      <p class="fp-status">Generating a draft from your profile and company research…</p>
      <div class="fp-spinner" aria-hidden="true"></div>
      <div class="fp-actions" hidden></div>
    </div>
  `;
  document.documentElement.appendChild(root);
  return {
    root,
    status: root.querySelector('.fp-status') as HTMLParagraphElement,
    spinner: root.querySelector('.fp-spinner') as HTMLDivElement,
    actions: root.querySelector('.fp-actions') as HTMLDivElement,
    close: () => root.remove(),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] as string));
}

function waitForChoice(actions: HTMLDivElement, draft: { draftText?: string; draftBase64?: string; draftMime?: string; draftFilename?: string; title?: string }): Promise<'accept' | 'reject'> {
  return new Promise((resolve) => {
    actions.hidden = false;
    actions.innerHTML = '';
    const preview = document.createElement('button');
    preview.className = 'fp-preview';
    preview.type = 'button';
    preview.textContent = 'Preview';
    const accept = document.createElement('button');
    accept.className = 'fp-accept';
    accept.type = 'button';
    accept.textContent = 'Accept';
    const reject = document.createElement('button');
    reject.className = 'fp-reject';
    reject.type = 'button';
    reject.textContent = 'Reject';
    preview.addEventListener('click', () => {
      if (draft.draftBase64 && draft.draftMime) {
        const bytes = Uint8Array.from(atob(draft.draftBase64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: draft.draftMime });
        window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
        return;
      }
      const text = draft.draftText || '';
      const blob = new Blob([`${draft.title || 'Document'}\n\n${text}`], { type: 'text/plain' });
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    });
    accept.addEventListener('click', () => resolve('accept'));
    reject.addEventListener('click', () => resolve('reject'));
    actions.append(preview, accept, reject);
  });
}

async function pollJob(jobId: string): Promise<any> {
  const started = Date.now();
  while (Date.now() - started < MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const res = await apiFetch(`/api/document-jobs/${jobId}`);
    if (!res.ok) throw new Error(`Could not check document status (${res.status})`);
    const data = await res.json();
    const status = data.job?.status;
    if (status === 'ready' || status === 'failed' || status === 'rejected' || status === 'accepted') {
      return data.job;
    }
  }
  throw new Error('Document generation timed out.');
}

async function runOneGap(params: {
  gap: DocumentRecommendation;
  schema: FormSchema;
  predictions: PredictedFieldValue[];
  tone: string;
}): Promise<PredictedFieldValue | null> {
  const docName = params.gap.missingDocumentName || params.gap.suggestedTitle || 'Document';
  const overlay = mountOverlay(docName);
  try {
    const company = valueByLabel(params.predictions, params.schema, /company|employer|organization|organisation/);
    const role = valueByLabel(params.predictions, params.schema, /role|position|title|job/)
      || params.schema.title
      || '';
    const create = await apiFetch('/api/document-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        docType: params.gap.docType || 'cover_letter',
        title: params.gap.suggestedTitle || docName,
        company,
        role,
        formHeading: params.schema.title || '',
        formUrl: params.schema.url || location.href,
        tone: params.tone || 'professional',
        fieldId: params.gap.fieldId || params.gap.targetedFields?.[0],
      }),
    });
    if (!create.ok) throw new Error(`Could not start document builder (${create.status})`);
    const created = await create.json();
    const jobId = created.jobId || created.job?.id;
    if (!jobId) throw new Error('Document builder did not return a job id.');

    overlay.status.textContent = `Generating ${docName}… checking every 10 seconds.`;
    const job = await pollJob(jobId);
    if (job.status === 'failed') {
      throw new Error(job.error || 'Document generation failed.');
    }

    overlay.spinner.hidden = true;
    overlay.status.textContent = `${docName} is ready. Preview it, then accept or reject.`;
    const choice = await waitForChoice(overlay.actions, job);
    if (choice === 'reject') {
      await apiFetch(`/api/document-jobs/${jobId}/reject`, { method: 'POST' });
      return null;
    }

    const accept = await apiFetch(`/api/document-jobs/${jobId}/accept`, { method: 'POST' });
    if (!accept.ok) throw new Error(`Could not save the document (${accept.status})`);
    const accepted = await accept.json();
    const fieldId = params.gap.fieldId || params.gap.targetedFields?.[0] || '';
    const field = params.schema.fields.find((item) => item.id === fieldId);
    return {
      fieldId,
      selector: field?.selector,
      placeholder: field?.placeholder,
      value: accepted.filePayload?.fileName || job.draftFilename || 'document.pdf',
      confidence: 0.95,
      confidenceLevel: 'high',
      rationale: 'Generated document accepted for this upload.',
      filePayload: accepted.filePayload,
    };
  } finally {
    overlay.close();
  }
}

/** Fills generateable upload gaps with a blurred page overlay and 10s polling. */
export async function runDocumentBuilder(params: {
  gaps: DocumentRecommendation[];
  schema: FormSchema;
  predictions: PredictedFieldValue[];
  tone: string;
}): Promise<BuilderResult> {
  const generatable = params.gaps.filter((gap) => gap.canGenerate);
  const result: BuilderResult = { accepted: 0, rejected: 0, failed: 0, predictions: [] };
  for (const gap of generatable) {
    try {
      const prediction = await runOneGap({
        gap,
        schema: params.schema,
        predictions: params.predictions,
        tone: params.tone,
      });
      if (prediction?.filePayload) {
        result.accepted += 1;
        result.predictions.push(prediction);
      } else {
        result.rejected += 1;
      }
    } catch (error) {
      console.error('[FormPilot] document builder', error);
      result.failed += 1;
      mountOverlay(gap.missingDocumentName || 'Document');
      const root = document.getElementById('formpilot-doc-overlay');
      const status = root?.querySelector('.fp-status') as HTMLParagraphElement | null;
      const spinner = root?.querySelector('.fp-spinner') as HTMLDivElement | null;
      if (spinner) spinner.hidden = true;
      if (status) {
        status.classList.add('fp-error');
        status.textContent = error instanceof Error ? error.message : 'Document generation failed.';
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
      root?.remove();
    }
  }
  return result;
}
