/**
 * FormPilot AI - Background Service Worker
 * Manages side panel initialization, cross-context messaging,
 * and API synchronization with the FormPilot web dashboard.
 */

import { runActionableReminders } from './reminder-runner';
import { apiFetch } from './api';

/** Tabs where the side panel is currently open. In-memory so a stale storage flag cannot block open. */
const openPanelTabs = new Set<number>();

function enableSidePanelDefaults() {
  if (!chrome.sidePanel) return;
  chrome.sidePanel.setOptions({
    path: 'sidepanel/sidepanel.html',
    enabled: true,
  }).catch(() => {});
  if (chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Failed to set side panel behavior:', err);
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('formpilot-reminders', { periodInMinutes: 1 });
  enableSidePanelDefaults();
  chrome.storage.local.set({ formpilot_panel_open: false }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('formpilot-reminders', { periodInMinutes: 1 });
  enableSidePanelDefaults();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'formpilot-reminders') {
    runActionableReminders().catch(() => {});
  }
});

enableSidePanelDefaults();

function closeSidePanelForTab(tabId: number): Promise<void> {
  const sidePanel = chrome.sidePanel as typeof chrome.sidePanel & {
    close?: (options: { tabId: number }) => Promise<void>;
  };
  if (typeof sidePanel.close === 'function') {
    return sidePanel.close({ tabId }).then(() => {
      openPanelTabs.delete(tabId);
      void chrome.storage.local.set({ formpilot_panel_open: false });
    });
  }
  // Older Chrome: disable then re-enable so the next open works.
  return sidePanel.setOptions({ tabId, enabled: false }).then(() =>
    sidePanel.setOptions({
      tabId,
      path: 'sidepanel/sidepanel.html',
      enabled: true,
    })
  ).then(() => {
    openPanelTabs.delete(tabId);
    void chrome.storage.local.set({ formpilot_panel_open: false });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === 'OPEN_SIDE_PANEL' || message.type === 'TOGGLE_SIDE_PANEL') {
    const tabId = sender.tab?.id;
    const toggle = message.type === 'TOGGLE_SIDE_PANEL';

    if (tabId == null) {
      sendResponse({ ok: false, open: false, error: 'No tab available for the side panel' });
      return false;
    }

    if (!chrome.sidePanel?.open) {
      sendResponse({ ok: false, open: false, error: 'Side panel is not available in this Chrome build.' });
      return false;
    }

    const isOpen = openPanelTabs.has(tabId);

    if (toggle && isOpen) {
      closeSidePanelForTab(tabId)
        .then(() => sendResponse({ ok: true, open: false, mode: 'sidepanel' }))
        .catch((err) => {
          openPanelTabs.delete(tabId);
          sendResponse({ ok: false, open: false, error: err?.message || 'Could not close FormPilot' });
        });
      return true;
    }

    // sidePanel.open must run in the same turn as the user gesture — no await before this.
    const openResult = chrome.sidePanel.open({ tabId });
    Promise.resolve(openResult)
      .then(() => {
        openPanelTabs.add(tabId);
        void chrome.storage.local.set({ formpilot_panel_open: true });
        sendResponse({ ok: true, open: true, mode: 'sidepanel' });
      })
      .catch((err) => {
        // If open failed because the panel was disabled for this tab, re-enable and retry once.
        chrome.sidePanel.setOptions({
          tabId,
          path: 'sidepanel/sidepanel.html',
          enabled: true,
        }).then(() => chrome.sidePanel.open({ tabId })).then(() => {
          openPanelTabs.add(tabId);
          void chrome.storage.local.set({ formpilot_panel_open: true });
          sendResponse({ ok: true, open: true, mode: 'sidepanel' });
        }).catch((retryErr) => {
          sendResponse({
            ok: false,
            open: false,
            error: retryErr?.message || err?.message || 'Could not open FormPilot',
          });
        });
      });
    return true;
  }

  if (message.type === 'SIDE_PANEL_STATE') {
    const open = Boolean(message.payload?.open);
    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      if (open) openPanelTabs.add(tabId);
      else openPanelTabs.delete(tabId);
    } else if (!open) {
      openPanelTabs.clear();
    }
    chrome.storage.local.set({ formpilot_panel_open: open }).then(() => {
      sendResponse({ ok: true, open });
    }).catch((err) => {
      sendResponse({ ok: false, error: err?.message || 'Could not update panel state' });
    });
    return true;
  }

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
    return true;
  }

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
        sendResponse({ success: false, error: err.message || 'Failed to submit form fill' });
      }
    })();
    return true;
  }

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
    return true;
  }

  return false;
});
