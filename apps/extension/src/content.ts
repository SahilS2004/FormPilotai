import { 
  DomFormExtractor, 
  SyntheticEventDispatcher, 
  ConfidenceHeatmapRenderer, 
  InPageMicroPromptBar 
} from '@formpilot/dom-analyzer';
import { PredictedFieldValue, FormSchema, MicroPromptCommand } from '@formpilot/shared';

/**
 * FormPilot Content Script
 * Executes in target web page DOM context.
 */

// Mount the In-Page Micro-Prompt Bar for instant voice/text steering
InPageMicroPromptBar.mount((cmd: MicroPromptCommand) => {
  chrome.runtime.sendMessage({
    type: 'MICRO_PROMPT_TRIGGERED',
    payload: cmd
  });
});

// Handle incoming control messages from Side Panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_SCHEMA') {
    const schema = DomFormExtractor.extractFormSchema(document);
    sendResponse({ success: true, schema });
    return true;
  }

  if (message.type === 'APPLY_PREDICTIONS') {
    const predictions: PredictedFieldValue[] = message.payload.predictions;
    const showHeatmap: boolean = message.payload.showHeatmap ?? true;

    let appliedCount = 0;
    predictions.forEach((pred) => {
      const el = document.getElementById(pred.fieldId) || document.querySelector(`[name="${pred.fieldId}"]`);
      if (el && el instanceof HTMLElement) {
        const success = SyntheticEventDispatcher.setInputValue(el, pred.value);
        if (success) appliedCount++;
      }
    });

    if (showHeatmap) {
      ConfidenceHeatmapRenderer.renderHeatmap(predictions);
    }

    sendResponse({ success: true, appliedCount, total: predictions.length });
    return true;
  }

  if (message.type === 'TOGGLE_HEATMAP') {
    if (message.payload.enabled) {
      if (message.payload.predictions) {
        ConfidenceHeatmapRenderer.renderHeatmap(message.payload.predictions);
      }
    } else {
      ConfidenceHeatmapRenderer.clearHeatmap();
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'TRIGGER_NEXT_STEP') {
    const stepInfo = DomFormExtractor.detectStepInfo(document);
    if (stepInfo?.nextButtonSelector) {
      const btn = document.querySelector<HTMLElement>(stepInfo.nextButtonSelector);
      if (btn) {
        btn.click();
        sendResponse({ success: true, navigated: true });
        return true;
      }
    }
    sendResponse({ success: false, reason: 'Next button not found' });
    return true;
  }

  return false;
});
