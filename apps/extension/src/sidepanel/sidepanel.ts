import { KBDocument, FormSchema, PredictedFieldValue, DocumentRecommendation, PersonaTone } from '@formpilot/shared';
import { apiFetch, getApiBase } from '../api';

/**
 * FormPilot Side Panel Controller
 * Handles DOM field scanning, in-extension persona steering,
 * context snippet clipping, and autonomous form autofills.
 */

const SUN_ICON = `<svg class="theme-icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

const MOON_ICON = `<svg class="theme-icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

const PLUS_ICON = `<svg class="icon-plus" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

const MINUS_ICON = `<svg class="icon-minus" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

let currentDocuments: KBDocument[] = [];
let lastPredictions: PredictedFieldValue[] = [];
let activeTone: PersonaTone = 'professional';
let isDarkMode = false;

document.addEventListener('DOMContentLoaded', async () => {
  chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', payload: { open: true } }).catch(() => {});
  window.addEventListener('pagehide', () => {
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_STATE', payload: { open: false } }).catch(() => {});
  });

  // UI Elements
  const btnManageKb = document.getElementById('btn-manage-kb');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIconWrap = document.getElementById('theme-icon-wrap');
  const selectTone = document.getElementById('select-tone') as HTMLSelectElement | null;
  const btnScanFields = document.getElementById('btn-scan-fields');
  const scanBadge = document.getElementById('scan-badge');
  const btnFillForm = document.getElementById('btn-fill-form');
  const fillStatus = document.getElementById('fill-status');
  const docList = document.getElementById('doc-list');
  const activeBadge = document.getElementById('active-docs-badge');
  const btnSyncKb = document.getElementById('btn-sync-kb');
  const toggleHeatmap = document.getElementById('toggle-heatmap') as HTMLInputElement | null;
  const multiStepCard = document.getElementById('multistep-card');
  const btnNextStep = document.getElementById('btn-next-step');
  const gapAlertCard = document.getElementById('gap-alert-card');
  const btnGapUpload = document.getElementById('btn-gap-upload');

  // Snippet Elements
  const btnToggleSnippet = document.getElementById('btn-toggle-snippet');
  const snippetBody = document.getElementById('snippet-body');
  const snippetExpandIndicator = document.getElementById('snippet-expand-indicator');
  const inputSnippetText = document.getElementById('input-snippet-text') as HTMLTextAreaElement | null;
  const btnSaveSnippet = document.getElementById('btn-save-snippet');
  const snippetSaveStatus = document.getElementById('snippet-save-status');

  // 1. Initialize Theme
  const { formpilot_theme } = await chrome.storage.local.get('formpilot_theme');
  if (formpilot_theme === 'dark' || (!formpilot_theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode = true;
    document.documentElement.classList.add('dark');
    if (themeIconWrap) themeIconWrap.innerHTML = SUN_ICON;
  } else {
    isDarkMode = false;
    document.documentElement.classList.remove('dark');
    if (themeIconWrap) themeIconWrap.innerHTML = MOON_ICON;
  }

  btnThemeToggle?.addEventListener('click', async () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      if (themeIconWrap) themeIconWrap.innerHTML = SUN_ICON;
      await chrome.storage.local.set({ formpilot_theme: 'dark' });
    } else {
      document.documentElement.classList.remove('dark');
      if (themeIconWrap) themeIconWrap.innerHTML = MOON_ICON;
      await chrome.storage.local.set({ formpilot_theme: 'light' });
    }
  });

  // 2. Initialize Persona Tone
  const { formpilot_tone } = await chrome.storage.local.get('formpilot_tone');
  if (formpilot_tone && selectTone) {
    activeTone = formpilot_tone;
    selectTone.value = formpilot_tone;
  }

  selectTone?.addEventListener('change', async () => {
    activeTone = (selectTone.value as PersonaTone) || 'professional';
    await chrome.storage.local.set({ formpilot_tone: activeTone });
  });

  const apiBase = await getApiBase();

  btnManageKb?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiBase}/dashboard` });
  });

  // 4. Load & Sync Documents
  await loadDocuments();

  // Network & Messaging Resilience Helpers
  async function queryFormPredictions(payload: any) {
    try {
      const res = await apiFetch('/api/fill-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, ...data };
    } catch (err: any) {
      try {
        return await chrome.runtime.sendMessage({ type: 'SUBMIT_FORM_FILL', payload });
      } catch (e: any) {
        throw new Error(err.message || `Could not connect to FormPilot at ${apiBase}`);
      }
    }
  }

  async function syncDocumentsApi() {
    try {
      const res = await apiFetch('/api/documents');
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const data = await res.json();
      await chrome.storage.local.set({ cachedDocuments: data.documents || [] });
      return { success: true, documents: data.documents || [] };
    } catch (err: any) {
      try {
        return await chrome.runtime.sendMessage({ type: 'SYNC_DOCUMENTS' });
      } catch (e: any) {
        throw new Error(err.message || `Failed to sync with ${apiBase}/api/documents`);
      }
    }
  }

  async function ensureTabConnected(tabId: number): Promise<boolean> {
    try {
      const ping = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      if (ping?.pong) return true;
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        await new Promise((r) => setTimeout(r, 150));
        return true;
      } catch (err) {
        console.warn('[FormPilot] Dynamic script injection unavailable on this tab:', err);
        return false;
      }
    }
    return true;
  }

  btnSyncKb?.addEventListener('click', async () => {
    const syncText = btnSyncKb.querySelector('span');
    if (syncText) syncText.innerText = 'Syncing...';
    btnSyncKb.classList.add('syncing');
    try {
      const res: any = await syncDocumentsApi();
      if (res?.success && res.documents) {
        currentDocuments = res.documents;
        renderDocuments();
      }
    } catch (e: any) {
      console.warn('Sync failed:', e);
    } finally {
      setTimeout(() => {
        if (syncText) syncText.innerText = 'Sync';
        btnSyncKb.classList.remove('syncing');
      }, 500);
    }
  });

  // 5. Scan & Highlight Fields on Active Webpage
  btnScanFields?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      if (scanBadge) {
        scanBadge.classList.remove('hidden');
        scanBadge.innerText = 'Cannot connect to active tab';
      }
      return;
    }

    const connected = await ensureTabConnected(tab.id);
    if (!connected) {
      if (scanBadge) {
        scanBadge.classList.remove('hidden');
        scanBadge.innerText = 'Cannot scan this tab (e.g. chrome:// internal page). Please open a regular webpage.';
      }
      return;
    }

    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FIELDS' });
      if (res?.success) {
        if (scanBadge) {
          scanBadge.classList.remove('hidden');
          scanBadge.innerText = `🔍 ${res.count} interactive fields detected & highlighted`;
        }
      } else {
        if (scanBadge) {
          scanBadge.classList.remove('hidden');
          scanBadge.innerText = res?.error || 'No fillable fields detected on this page';
        }
      }
    } catch (err: any) {
      if (scanBadge) {
        scanBadge.classList.remove('hidden');
        scanBadge.innerText = 'Please refresh the tab to connect FormPilot scanner';
      }
    }
  });

  // 6. Handle Fill Form. A Next button means another step, so keep filling until it is gone.
  btnFillForm?.addEventListener('click', async () => {
    if (!fillStatus) return;

    fillStatus.classList.remove('hidden');
    fillStatus.innerText = 'Connecting to webpage DOM...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      fillStatus.innerText = 'Error: Cannot access active tab';
      return;
    }

    const connected = await ensureTabConnected(tab.id);
    if (!connected) {
      fillStatus.innerText = 'Error: Cannot inject scanner into this tab (e.g. chrome:// page). Please open a regular web page.';
      return;
    }

    const signatureOf = (schema: FormSchema) => schema.fields.map((field) => `${field.label}|${field.type}|${field.name || ''}`).join('||');
    const seenSteps = new Set<string>();
    let totalApplied = 0;
    let stepsFilled = 0;

    try {
      for (let step = 0; step < 8; step += 1) {
        fillStatus.innerText = step === 0 ? 'Extracting form structure...' : `Filling step ${step + 1}...`;
        const schemaRes = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_SCHEMA' });
        if (!schemaRes?.success || !schemaRes.schema) {
          if (stepsFilled === 0) fillStatus.innerText = schemaRes?.error || 'No fillable form fields detected on page';
          break;
        }

        const schema: FormSchema = schemaRes.schema;
        const signature = signatureOf(schema);
        if (seenSteps.has(signature)) break;
        seenSteps.add(signature);

        if (schema.stepInfo && multiStepCard) {
          multiStepCard.classList.remove('hidden');
          const counter = document.getElementById('step-counter');
          if (counter) {
            counter.innerText = `Step ${schema.stepInfo.currentStep}${schema.stepInfo.totalSteps ? ` of ${schema.stepInfo.totalSteps}` : ''}`;
          }
        }

        fillStatus.innerText = `Found ${schema.fields.length} fields. Querying Knowledge Base (${activeTone} tone)...`;
        const activeDocIds = currentDocuments.filter((d) => d.isEnabled).map((d) => d.id);
        const fillRes: any = await queryFormPredictions({ schema, activeDocIds, tone: activeTone });
        if (!fillRes?.success || !fillRes.predictions) {
          fillStatus.innerText = fillRes?.error || 'Failed to reason form predictions';
          return;
        }

        lastPredictions = fillRes.predictions;
        const fieldsById = new Map(schema.fields.map((field) => [field.id, field]));
        const predictions = fillRes.predictions.map((prediction: PredictedFieldValue) => {
          const field = fieldsById.get(prediction.fieldId);
          return {
            ...prediction,
            selector: prediction.selector || field?.selector,
            placeholder: prediction.placeholder || field?.placeholder,
          };
        });

        const generatableGaps: DocumentRecommendation[] = (fillRes.gapRecommendations || [])
          .filter((gap: DocumentRecommendation) => gap.canGenerate);
        const otherGaps: DocumentRecommendation[] = (fillRes.gapRecommendations || [])
          .filter((gap: DocumentRecommendation) => !gap.canGenerate);

        const applyRes = await chrome.tabs.sendMessage(tab.id, {
          type: 'APPLY_PREDICTIONS',
          payload: {
            predictions,
            showHeatmap: toggleHeatmap?.checked ?? false,
            skipFileFields: generatableGaps.length > 0,
          }
        });
        totalApplied += applyRes?.appliedCount || 0;
        stepsFilled += 1;

        if (generatableGaps.length > 0) {
          fillStatus.innerText = `Answers filled. Generating ${generatableGaps[0].missingDocumentName || 'document'}…`;
          const built = await chrome.tabs.sendMessage(tab.id, {
            type: 'RUN_DOCUMENT_BUILDER',
            payload: {
              gaps: generatableGaps,
              schema,
              predictions,
              tone: activeTone,
            },
          });
          if (built?.accepted) totalApplied += built.accepted;
          if (built?.failed) {
            fillStatus.innerText = `Document generation failed for ${built.failed} file${built.failed === 1 ? '' : 's'}.`;
          } else if (built?.rejected && !built?.accepted) {
            fillStatus.innerText = 'Generated document was rejected.';
          }
        }

        if (otherGaps.length > 0 && gapAlertCard) {
          const topGap = otherGaps[0];
          const gapReason = document.getElementById('gap-reason');
          if (gapReason) gapReason.innerText = `Missing: ${topGap.missingDocumentName}. ${topGap.reason}`;
          gapAlertCard.classList.remove('hidden');
        } else if (gapAlertCard) {
          gapAlertCard.classList.add('hidden');
        }

        const hasNext = Boolean(schema.stepInfo?.nextButtonSelector) && schema.stepInfo?.isFinalStep !== true;
        if (!hasNext) break;

        fillStatus.innerText = `Step ${stepsFilled} filled. Opening the next step...`;
        const moved = await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_NEXT_STEP' });
        if (!moved?.navigated) break;

        let changed = false;
        const started = Date.now();
        while (Date.now() - started < 4000) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const nextSchema = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_SCHEMA' });
          if (nextSchema?.schema && signatureOf(nextSchema.schema) !== signature) {
            changed = true;
            break;
          }
        }
        if (!changed) break;
      }

      fillStatus.innerText = totalApplied > 0
        ? `Filled ${totalApplied} fields.`
        : 'The form was read, but no answers could be written into its fields.';
    } catch (err: any) {
      console.error('Fill form error:', err);
      fillStatus.innerText = `Error: ${err.message || 'Operation failed'}`;
    }
  });

  // 7. Toggle Heatmap
  toggleHeatmap?.addEventListener('change', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_HEATMAP',
        payload: {
          enabled: toggleHeatmap.checked,
          predictions: lastPredictions
        }
      });
    }
  });

  // 8. Proceed to Next Step
  btnNextStep?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_NEXT_STEP' });
      if (fillStatus) fillStatus.innerText = 'Navigated to next step. Click Fill Form to continue!';
    }
  });

  // 9. Gap Upload Button
  btnGapUpload?.addEventListener('click', () => {
    chrome.tabs.create({ url: `${apiBase}/dashboard` });
  });

  // 10. Quick Context Snippet Accordion & Adder
  btnToggleSnippet?.addEventListener('click', () => {
    if (!snippetBody) return;
    const isHidden = snippetBody.classList.contains('hidden');
    if (isHidden) {
      snippetBody.classList.remove('hidden');
      if (snippetExpandIndicator) snippetExpandIndicator.innerHTML = MINUS_ICON;
    } else {
      snippetBody.classList.add('hidden');
      if (snippetExpandIndicator) snippetExpandIndicator.innerHTML = PLUS_ICON;
    }
  });

  btnSaveSnippet?.addEventListener('click', async () => {
    const text = inputSnippetText?.value.trim();
    if (!text) return;
    const statusText = snippetSaveStatus?.querySelector('span');
    if (snippetSaveStatus && statusText) {
      statusText.textContent = 'Saving…';
      snippetSaveStatus.classList.remove('hidden');
    }

    try {
      const res = await apiFetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          originalFilename: 'quick_snippet.txt',
          mimeType: 'text/plain',
          description: text,
          content: text,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (inputSnippetText) inputSnippetText.value = '';
      await loadDocuments();
      if (statusText) statusText.textContent = 'Saved';
    } catch (err: any) {
      if (statusText) statusText.textContent = 'Not saved';
    }

    if (snippetSaveStatus) {
      setTimeout(() => {
        snippetSaveStatus.classList.add('hidden');
      }, 2000);
    }
  });

  // Helper to load and render documents
  async function loadDocuments() {
    try {
      const synced = await syncDocumentsApi();
      if (synced?.success) {
        currentDocuments = synced.documents || [];
        renderDocuments();
        return;
      }
    } catch (err) {
      console.warn('Initial sync failed:', err);
    }

    const { cachedDocuments } = await chrome.storage.local.get('cachedDocuments');
    currentDocuments = Array.isArray(cachedDocuments) ? cachedDocuments : [];
    renderDocuments();
  }

  function renderDocuments() {
    if (!docList) return;
    docList.innerHTML = '';

    const activeCount = currentDocuments.filter((d) => d.isEnabled).length;
    if (activeBadge) {
      activeBadge.innerText = `${activeCount} Active`;
    }

    if (currentDocuments.length === 0) {
      docList.innerHTML = `
        <div class="empty-state">
          No documents in Knowledge Base.<br>Add a snippet above or upload docs in the dashboard.
        </div>
      `;
      return;
    }

    currentDocuments.forEach((doc) => {
      const row = document.createElement('div');
      row.className = 'doc-row';

      row.innerHTML = `
        <div class="doc-left">
          <div class="doc-icon-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div class="doc-info">
            <span class="doc-name" title="${doc.name}">${doc.name}</span>
            <span class="doc-desc" title="${doc.description}">${doc.description}</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" data-id="${doc.id}" ${doc.isEnabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      `;

      const input = row.querySelector('input') as HTMLInputElement;
      input.addEventListener('change', async () => {
        doc.isEnabled = input.checked;
        await chrome.storage.local.set({ cachedDocuments: currentDocuments });
        if (activeBadge) {
          const count = currentDocuments.filter((d) => d.isEnabled).length;
          activeBadge.innerText = `${count} Active`;
        }
      });

      docList.appendChild(row);
    });
  }
});
