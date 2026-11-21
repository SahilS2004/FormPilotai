/**
 * FormPilot AI - Background Service Worker
 * Manages side panel initialization, cross-context messaging,
 * and API synchronization with the FormPilot web dashboard.
 */

import { runActionableReminders } from './reminder-runner';
import { apiFetch } from './api';

// Enable opening side panel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('formpilot-reminders', { periodInMinutes: 1 });
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Failed to set side panel behavior:', err);
    });
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('formpilot-reminders', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'formpilot-reminders') {
    runActionableReminders().catch(() => {});
  }
});

// Relay messages between Side Panel, Content Scripts, and Backend API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'OPEN_SIDE_PANEL') {
    const tabId = sender.tab?.id;
    (async () => {
      try {
        if (tabId != null && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ tabId });
          sendResponse({ ok: true, mode: 'sidepanel' });
          return;
        }
      } catch (err) {
        console.warn('[FormPilot] side panel open failed, using a popup window', err);
      }
      await chrome.windows.create({
        url: chrome.runtime.getURL('sidepanel/sidepanel.html'),
        type: 'popup',
        width: 420,
        height: 720,
      });
      sendResponse({ ok: true, mode: 'popup' });
    })().catch((err) => {
      sendResponse({ ok: false, error: err?.message || 'Could not open FormPilot' });
    });
    return true;
  }

  // 1. Sync Documents
  if (message.type === 'SYNC_DOCUMENTS') {
    (async () => {
      try {
        const res = await apiFetch('/api/documents');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        await chrome.storage.local.set({ cachedDocuments: data.documents || [] });
        sendResponse({ success: true, documents: data.documents || [] });
      } catch (err: any) {
        console.error('SYNC_DOCUMENTS failed:', err);
        sendResponse({ success: false, error: err.message || 'Failed to sync documents' });
      }
    })();
    return true; // Keep channel open for async response
  }

  // 2. Submit Form Fill
  if (message.type === 'SUBMIT_FORM_FILL') {
    (async () => {
      try {
        const res = await apiFetch('/api/fill-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload || {})
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        sendResponse({ success: true, ...data });
      } catch (err: any) {
        console.error('SUBMIT_FORM_FILL failed:', err);
        sendResponse({ success: false, error: err.message || 'Failed to reason predictions' });
      }
    })();
    return true; // Keep channel open for async response
  }

  // 3. Record a form only after the person submits it
  if (message.type === 'FORM_SUBMITTED') {
    (async () => {
      try {
        const res = await apiFetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload || {}),
        });
        const data = await res.json().catch(() => ({}));
        sendResponse({ success: res.ok, record: data.record, error: data.error });
      } catch (err: any) {
        console.error('FORM_SUBMITTED failed:', err);
        sendResponse({ success: false, error: err.message || 'Failed to record submission' });
      }
    })();
    return true;
  }

  // 4. Record Submission History
  if (message.type === 'RECORD_SUBMISSION') {
    (async () => {
      try {
        await apiFetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload || {})
        });
        sendResponse({ success: true });
      } catch (err: any) {
        console.error('RECORD_SUBMISSION failed:', err);
        sendResponse({ success: false, error: err.message || 'Failed to record submission' });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Any other message (e.g. MICRO_PROMPT_TRIGGERED or internal events)
  return false;
});
