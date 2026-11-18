import { 
  DomFormExtractor, 
  SyntheticEventDispatcher, 
  ConfidenceHeatmapRenderer 
} from '@formpilot/dom-analyzer';
import { PredictedFieldValue, FormSchema } from '@formpilot/shared';
import { mountFloatingButton } from './fab';

/**
 * FormPilot Content Script
 * Executes in target web page DOM context.
 */

// Inject highlight styling for field scanner visual indicator
function ensureHighlightStyles() {
  const styleId = 'formpilot-scanner-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .formpilot-field-highlight {
        outline: 2px solid #00BAC6 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 12px rgba(0, 186, 198, 0.55) !important;
        transition: outline 0.2s ease, box-shadow 0.2s ease !important;
      }
    `;
    document.head.appendChild(style);
  }
}

if (!(window as Window & { __formpilotContent?: boolean }).__formpilotContent) {
(window as Window & { __formpilotContent?: boolean }).__formpilotContent = true;

// Handle incoming control messages from Side Panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  // 1. Health check / Ping
  if (message.type === 'PING') {
    sendResponse({ pong: true, url: window.location.href });
    return false;
  }

  // 2. Extract DOM Form Schema
  if (message.type === 'EXTRACT_SCHEMA') {
    try {
      const schema = DomFormExtractor.extractFormSchema(document);
      lastFilledSchema = schema;
      sendResponse({ success: true, schema });
    } catch (err: any) {
      console.error('[FormPilot] Schema extraction failed:', err);
      sendResponse({ success: false, error: err?.message || 'Failed to extract schema' });
    }
    return false;
  }

  // 3. Highlight Fields
  if (message.type === 'HIGHLIGHT_FIELDS') {
    try {
      ensureHighlightStyles();
      const schema = DomFormExtractor.extractFormSchema(document);
      let count = 0;
      schema.fields.forEach((f) => {
        let el: HTMLElement | null = null;
        try {
          el = document.getElementById(f.id) || 
               document.querySelector(f.selector) || 
               (f.name ? document.querySelector(`[name="${CSS.escape(f.name)}"]`) : null);
        } catch {
          el = document.getElementById(f.id);
        }

        if (el instanceof HTMLElement) {
          el.classList.add('formpilot-field-highlight');
          count++;
        }
      });

      // Auto-remove highlight after 5 seconds if not cleared
      setTimeout(() => {
        document.querySelectorAll('.formpilot-field-highlight').forEach((el) => {
          el.classList.remove('formpilot-field-highlight');
        });
      }, 5000);

      sendResponse({ success: true, count });
    } catch (err: any) {
      console.error('[FormPilot] Highlight failed:', err);
      sendResponse({ success: false, error: err?.message || 'Highlight failed' });
    }
    return false;
  }

  // 4. Clear Highlights
  if (message.type === 'CLEAR_FIELD_HIGHLIGHTS') {
    try {
      document.querySelectorAll('.formpilot-field-highlight').forEach((el) => {
        el.classList.remove('formpilot-field-highlight');
      });
      sendResponse({ success: true });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || 'Clear highlights failed' });
    }
    return false;
  }

  // 5. Apply AI Form Predictions & Document File Attachments
  if (message.type === 'APPLY_PREDICTIONS') {
    try {
      const predictions: PredictedFieldValue[] = message.payload?.predictions || [];
      const showHeatmap: boolean = message.payload?.showHeatmap ?? true;

      let appliedCount = 0;
      predictions.forEach((pred) => {
        if (pred.value === '' || pred.value == null) return;
        const el = findPredictionElement(pred);
        if (el && el instanceof HTMLElement) {
          const success = SyntheticEventDispatcher.setInputValue(el, pred.value, pred.filePayload);
          if (success) appliedCount++;
        }
      });

      if (showHeatmap) {
        ConfidenceHeatmapRenderer.renderHeatmap(predictions);
      }

      if (appliedCount > 0) {
        pageWasFilled = true;
      }
      if (lastFilledSchema) rememberCurrentAnswers(lastFilledSchema);

      sendResponse({ success: true, appliedCount, total: predictions.length });
    } catch (err: any) {
      console.error('[FormPilot] Apply predictions failed:', err);
      sendResponse({ success: false, error: err?.message || 'Failed to apply predictions' });
    }
    return false;
  }

  // 6. Toggle Heatmap Overlays
  if (message.type === 'TOGGLE_HEATMAP') {
    try {
      if (message.payload?.enabled) {
        if (message.payload.predictions) {
          ConfidenceHeatmapRenderer.renderHeatmap(message.payload.predictions);
        }
      } else {
        ConfidenceHeatmapRenderer.clearHeatmap();
      }
      sendResponse({ success: true });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || 'Toggle heatmap failed' });
    }
    return false;
  }

  // 7. Multi-Step Form Navigation
  if (message.type === 'TRIGGER_NEXT_STEP') {
    try {
      const stepInfo = DomFormExtractor.detectStepInfo(document);
      if (stepInfo?.nextButtonSelector) {
        const btn = document.querySelector<HTMLElement>(stepInfo.nextButtonSelector);
        if (btn) {
          btn.click();
          sendResponse({ success: true, navigated: true });
          return false;
        }
      }
      sendResponse({ success: false, reason: 'Next button not found' });
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || 'Step navigation failed' });
    }
    return false;
  }

  if (message.type === 'SUBMIT_FORM') {
    try {
      const stepInfo = DomFormExtractor.detectStepInfo(document);
      const button = (stepInfo?.submitButtonSelector
        ? document.querySelector<HTMLElement>(stepInfo.submitButtonSelector)
        : null)
        || document.querySelector<HTMLElement>('button[type="submit"], input[type="submit"]');
      if (button) {
        button.click();
        reportSubmittedForm(true);
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No submit button found' });
      }
    } catch (err: any) {
      sendResponse({ success: false, error: err?.message || 'Submit failed' });
    }
    return false;
  }

  return false;
});

let lastFilledSchema: FormSchema | null = null;
let pageWasFilled = false;
let submitWatcherReady = false;
let lastSubmitRecordedAt = 0;
const collectedAnswers = new Map<string, {
  fieldId: string;
  question: string;
  answer: string;
  confidence: number;
  wasEditedByUser: boolean;
}>();

function readControlValue(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox') return el.checked ? 'Yes' : '';
    if (el.type === 'radio') return el.checked ? (el.closest('label')?.innerText || el.value).trim() : '';
    if (el.type === 'file') return el.files?.[0]?.name || '';
    return el.value;
  }
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return el.value;
  return (el.textContent || '').trim();
}

function isSensitiveField(field: { label?: string; name?: string; type?: string }): boolean {
  const blob = `${field.type || ''} ${field.label || ''} ${field.name || ''}`.toLowerCase();
  return field.type === 'password' || /password|passcode|ssn|social security|card number|cvv|cvc/.test(blob);
}

function readFieldAnswer(field: FormSchema['fields'][number]): string {
  if (isSensitiveField(field)) return '';
  if ((field.type === 'radio' || field.type === 'checkbox') && field.name) {
    const selector = `input[type="${field.type}"][name="${CSS.escape(field.name)}"]:checked`;
    const checked = Array.from(document.querySelectorAll<HTMLInputElement>(selector));
    const labels = checked.map((input) => {
      const option = field.options?.find((item) => item.value === input.value);
      return option?.label || input.closest('label')?.innerText?.trim() || input.value;
    }).filter(Boolean);
    if (labels.length > 0) return labels.join(', ');
  }
  const el = findPredictionElement({
    fieldId: field.id,
    selector: field.selector,
    placeholder: field.placeholder,
    value: '',
    confidence: 1,
    confidenceLevel: 'high',
  });
  return el ? readControlValue(el).trim() : '';
}

function rememberCurrentAnswers(schema: FormSchema) {
  lastFilledSchema = schema;
  for (const field of schema.fields) {
    const answer = readFieldAnswer(field);
    if (!answer) continue;
    const key = `${field.label || field.name || field.id}`;
    collectedAnswers.set(key, {
      fieldId: field.id,
      question: field.label || field.name || field.id,
      answer,
      confidence: 1,
      wasEditedByUser: false,
    });
  }
}

function buttonText(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const control = target.closest('button, input[type="submit"], input[type="button"], [role="button"]');
  return control instanceof HTMLElement ? control : null;
}

function armSubmitWatcher() {
  if (submitWatcherReady) return;
  submitWatcherReady = true;
  document.addEventListener('submit', (event) => {
    const form = event.target instanceof HTMLFormElement ? event.target : null;
    if (form) rememberCurrentAnswers(DomFormExtractor.extractFormSchema(document));
    reportSubmittedForm(false);
  }, true);
  document.addEventListener('click', (event) => {
    const control = buttonText(event.target);
    if (!control) return;
    const text = (control.innerText || control.getAttribute('value') || '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!text) return;
    if (/\b(next|continue|proceed|back|previous|cancel)\b/.test(text)) {
      rememberCurrentAnswers(DomFormExtractor.extractFormSchema(document));
      return;
    }
    const isSubmit = control.getAttribute('type') === 'submit'
      || /\b(submit|finish|complete|send|apply)\b/.test(text);
    if (!isSubmit) return;
    rememberCurrentAnswers(DomFormExtractor.extractFormSchema(document));
    window.setTimeout(() => reportSubmittedForm(false), 300);
  }, true);
}

const OWN_APP_HOST = /(^|\.)formpilot\.|\.elb\.amazonaws\.com$|^localhost$|^127\.0\.0\.1$/i;

function reportSubmittedForm(wasAutoSubmitted: boolean) {
  if (OWN_APP_HOST.test(location.hostname)) return;
  const schema = DomFormExtractor.extractFormSchema(document);
  rememberCurrentAnswers(schema);
  const fields = Array.from(collectedAnswers.values()).filter((field) => field.answer.trim() !== '');
  if (fields.length === 0) return;
  const now = Date.now();
  if (now - lastSubmitRecordedAt < 4000) return;
  lastSubmitRecordedAt = now;

  const heading = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim();
  chrome.runtime.sendMessage({
    type: 'FORM_SUBMITTED',
    payload: {
      submitted: true,
      domain: location.hostname,
      url: location.href,
      formTitle: heading || document.title || lastFilledSchema?.title || 'Web Form',
      totalFieldsCount: Math.max(schema.fields.length, fields.length),
      filledFieldsCount: fields.length,
      wasAutoSubmitted,
      fields,
    },
  }).catch(() => {});
}

function findPredictionElement(pred: PredictedFieldValue): HTMLElement | null {
  if (pred.selector) {
    try {
      const matches = Array.from(document.querySelectorAll(pred.selector));
      if (matches.length === 1 && matches[0] instanceof HTMLElement) return matches[0];
    } catch {
      // A bad selector should fall through to the placeholder, id, and name.
    }
  }
  if (pred.placeholder) {
    const byPlaceholder = Array.from(document.querySelectorAll('input, textarea, select')).find(
      (el) => el.getAttribute('placeholder') === pred.placeholder
    );
    if (byPlaceholder instanceof HTMLElement) return byPlaceholder;
  }
  const byId = document.getElementById(pred.fieldId);
  if (byId instanceof HTMLElement) return byId;
  try {
    const byName = document.querySelector(`[name="${CSS.escape(pred.fieldId)}"]`);
    if (byName instanceof HTMLElement) return byName;
  } catch {
    return null;
  }
  return null;
}

const pageHost = location.hostname;
if (pageHost !== 'localhost' && pageHost !== '127.0.0.1') {
  mountFloatingButton();
}
armSubmitWatcher();
}
