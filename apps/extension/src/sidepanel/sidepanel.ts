import { KBDocument, FormSchema, PredictedFieldValue, DocumentRecommendation } from '@formpilot/shared';

/**
 * FormPilot Side Panel Controller
 */

let currentDocuments: KBDocument[] = [];
let lastPredictions: PredictedFieldValue[] = [];

document.addEventListener('DOMContentLoaded', async () => {
  const btnManageKb = document.getElementById('btn-manage-kb');
  const btnFillForm = document.getElementById('btn-fill-form');
  const fillStatus = document.getElementById('fill-status');
  const docList = document.getElementById('doc-list');
  const activeBadge = document.getElementById('active-docs-badge');
  const toggleHeatmap = document.getElementById('toggle-heatmap') as HTMLInputElement;
  const multiStepCard = document.getElementById('multistep-card');
  const btnNextStep = document.getElementById('btn-next-step');
  const gapAlertCard = document.getElementById('gap-alert-card');
  const btnGapUpload = document.getElementById('btn-gap-upload');

  // 1. Open Web App Knowledge Base Manager
  btnManageKb?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // 2. Load Documents
  await loadDocuments();

  // 3. Handle Fill Form
  btnFillForm?.addEventListener('click', async () => {
    if (!fillStatus) return;

    fillStatus.classList.remove('hidden');
    fillStatus.innerText = 'Scanning webpage DOM fields...';

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      fillStatus.innerText = 'Error: Cannot access active tab';
      return;
    }

    try {
      // Step A: Extract Schema from Content Script
      const schemaRes = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_SCHEMA' });
      if (!schemaRes?.success || !schemaRes.schema) {
        fillStatus.innerText = 'No fillable form fields detected on page';
        return;
      }

      const schema: FormSchema = schemaRes.schema;
      fillStatus.innerText = `Found ${schema.fields.length} fields. Querying Knowledge Base...`;

      // Check multi-step
      if (schema.stepInfo && multiStepCard) {
        multiStepCard.classList.remove('hidden');
        const counter = document.getElementById('step-counter');
        if (counter) {
          counter.innerText = `Step ${schema.stepInfo.currentStep}${schema.stepInfo.totalSteps ? ` of ${schema.stepInfo.totalSteps}` : ''}`;
        }
      }

      // Step B: Query Backend Context Engine
      const activeDocIds = currentDocuments.filter((d) => d.isEnabled).map((d) => d.id);
      const fillRes: any = await chrome.runtime.sendMessage({
        type: 'SUBMIT_FORM_FILL',
        payload: {
          schema,
          activeDocIds
        }
      });

      if (!fillRes?.success || !fillRes.predictions) {
        fillStatus.innerText = 'Failed to reason form predictions';
        return;
      }

      lastPredictions = fillRes.predictions;

      // Step C: Apply Predictions to DOM
      const applyRes = await chrome.tabs.sendMessage(tab.id, {
        type: 'APPLY_PREDICTIONS',
        payload: {
          predictions: fillRes.predictions,
          showHeatmap: toggleHeatmap?.checked ?? true
        }
      });

      fillStatus.innerText = `✓ Successfully filled ${applyRes.appliedCount || schema.fields.length} fields!`;

      // Step D: Show Document Gap Alert if missing documents were detected
      if (fillRes.gapRecommendations && fillRes.gapRecommendations.length > 0 && gapAlertCard) {
        const topGap: DocumentRecommendation = fillRes.gapRecommendations[0];
        const gapReason = document.getElementById('gap-reason');
        if (gapReason) {
          gapReason.innerText = `Missing: ${topGap.missingDocumentName}. ${topGap.reason}`;
        }
        gapAlertCard.classList.remove('hidden');
      }

      // Step E: Record to History
      await chrome.runtime.sendMessage({
        type: 'RECORD_SUBMISSION',
        payload: {
          domain: schema.domain,
          url: schema.url,
          formTitle: schema.title,
          tone: 'professional',
          totalFieldsCount: schema.fields.length,
          filledFieldsCount: applyRes.appliedCount || schema.fields.length,
          fields: fillRes.predictions.map((p: PredictedFieldValue, idx: number) => ({
            fieldId: p.fieldId,
            question: schema.fields[idx]?.label || p.fieldId,
            answer: String(p.value),
            confidence: p.confidence,
            wasEditedByUser: false
          }))
        }
      });
    } catch (err: any) {
      fillStatus.innerText = `Error: ${err.message || 'Operation failed'}`;
    }
  });

  // 4. Toggle Heatmap
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

  // 5. Proceed to Next Step
  btnNextStep?.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_NEXT_STEP' });
      fillStatus!.innerText = 'Navigated to next step. Click Fill Form to continue!';
    }
  });

  // 6. Gap Upload Button
  btnGapUpload?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  // Function to load and render documents
  async function loadDocuments() {
    const { cachedDocuments } = await chrome.storage.local.get('cachedDocuments');
    if (cachedDocuments && Array.isArray(cachedDocuments)) {
      currentDocuments = cachedDocuments;
    } else {
      // Fallback seed docs if offline
      currentDocuments = [
        {
          id: 'doc_1',
          name: 'Sahil_Sarawgi_Resume_2026.pdf',
          originalFilename: 'resume.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 142800,
          description: 'Updated Software Engineering resume detailing TypeScript and AI experience.',
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'doc_2',
          name: 'Form_1040_Tax_Return_2024.pdf',
          originalFilename: 'tax.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 312400,
          description: 'Official tax declaration containing gross income and deductions.',
          isEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'doc_3',
          name: 'Passport_and_ID_Scan.pdf',
          originalFilename: 'passport.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 890000,
          description: 'Government identification with legal name and citizenship.',
          isEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      await chrome.storage.local.set({ cachedDocuments: currentDocuments });
    }

    renderDocuments();
  }

  function renderDocuments() {
    if (!docList) return;
    docList.innerHTML = '';

    const activeCount = currentDocuments.filter((d) => d.isEnabled).length;
    if (activeBadge) {
      activeBadge.innerText = `${activeCount} Active`;
    }

    currentDocuments.forEach((doc) => {
      const row = document.createElement('div');
      row.className = 'doc-row';

      row.innerHTML = `
        <div class="doc-info">
          <span class="doc-name" title="${doc.name}">${doc.name}</span>
          <span class="doc-desc" title="${doc.description}">${doc.description}</span>
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
