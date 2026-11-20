const API_BASE = 'http://localhost:3000';

interface ReminderJob {
  id: string;
  websiteUrl: string;
  title: string;
  autoActionPolicy: 'notify_only' | 'auto_fill_draft' | 'auto_submit';
  minConfidenceThreshold: number;
  tone?: string;
}

function waitForTab(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve();
    }, 15000);
    const onUpdated = (id: number, info: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        setTimeout(resolve, 700);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function finish(id: string, status: string, executionLog: string) {
  await fetch(`${API_BASE}/api/reminders`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      status,
      executionLog,
      executedAt: new Date().toISOString(),
    }),
  }).catch(() => {});
}

async function executeReminder(job: ReminderJob) {
  const claim = await fetch(`${API_BASE}/api/reminders`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: job.id, claim: true }),
  });
  if (!claim.ok) return;

  let tab: chrome.tabs.Tab | undefined;
  try {
    const existing = await chrome.tabs.query({ url: job.websiteUrl });
    tab = existing.find((item) => item.id);
  } catch {
    tab = undefined;
  }
  if (!tab?.id) {
    tab = await chrome.tabs.create({ url: job.websiteUrl, active: true });
  }
  if (!tab.id) {
    await finish(job.id, 'failed', 'Could not open the form tab.');
    return;
  }

  await waitForTab(tab.id);
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch {
    // The content script may already be on the page.
  }

  const extracted = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_SCHEMA' }).catch(() => null);
  if (!extracted?.success || !extracted.schema) {
    await finish(job.id, 'failed', 'The page opened, but FormPilot could not read a form on it.');
    return;
  }

  const fillRes = await fetch(`${API_BASE}/api/fill-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schema: extracted.schema, tone: job.tone || 'professional' }),
  });
  if (!fillRes.ok) {
    await finish(job.id, 'failed', 'The fill service did not return an answer.');
    return;
  }
  const fill = await fillRes.json();
  const fieldsById = new Map(
    (extracted.schema.fields || []).map((field: { id: string; selector?: string; placeholder?: string }) => [field.id, field])
  );
  const predictions = (fill.predictions || []).map((item: { fieldId: string; selector?: string; placeholder?: string }) => {
    const field = fieldsById.get(item.fieldId);
    return {
      ...item,
      selector: item.selector || field?.selector,
      placeholder: item.placeholder || field?.placeholder,
    };
  });
  await chrome.tabs.sendMessage(tab.id, {
    type: 'APPLY_PREDICTIONS',
    payload: { predictions, showHeatmap: true },
  });

  const requiredIds = new Set(
    (extracted.schema.fields || []).filter((field: { required?: boolean; id: string }) => field.required).map((field: { id: string }) => field.id)
  );
  const checked = predictions.filter((item: { fieldId: string }) => requiredIds.size === 0 || requiredIds.has(item.fieldId));
  const low = checked.filter((item: { confidence: number }) => item.confidence < job.minConfidenceThreshold);

  if (job.autoActionPolicy === 'auto_submit' && low.length === 0 && predictions.length > 0) {
    const submitted = await chrome.tabs.sendMessage(tab.id, { type: 'SUBMIT_FORM' }).catch(() => null);
    await finish(
      job.id,
      submitted?.success ? 'auto_completed' : 'failed',
      submitted?.success
        ? 'Filled the form and clicked submit because every required field met the confidence threshold.'
        : 'Filled the form, but no submit button was found.'
    );
    return;
  }

  if (job.autoActionPolicy === 'auto_submit') {
    await finish(
      job.id,
      'failed',
      `Filled the form and left it for review. ${low.length} required field${low.length === 1 ? '' : 's'} were below ${Math.round(job.minConfidenceThreshold * 100)}% confidence, so it was not submitted.`
    );
    return;
  }

  await finish(job.id, 'auto_completed', 'Draft filled in the open tab. Review it before you submit.');
}

export async function runActionableReminders() {
  try {
    const res = await fetch(`${API_BASE}/api/reminders?actionable=1`);
    if (!res.ok) return;
    const data = await res.json();
    for (const job of data.reminders || []) {
      await executeReminder(job);
    }
  } catch (err) {
    console.warn('[FormPilot] reminder run failed', err);
  }
}
