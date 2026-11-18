/**
 * FormPilot AI - Background Service Worker
 * Manages side panel initialization, cross-context messaging,
 * and API synchronization with the FormPilot web dashboard.
 */

// Enable opening side panel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Failed to set side panel behavior:', err);
    });
  }
});

// Relay messages between Side Panel, Content Scripts, and Backend API
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === 'SYNC_DOCUMENTS') {
        const res = await fetch('http://localhost:3000/api/documents');
        const data = await res.json();
        await chrome.storage.local.set({ cachedDocuments: data.documents });
        sendResponse({ success: true, documents: data.documents });
        return;
      }

      if (message.type === 'SUBMIT_FORM_FILL') {
        const res = await fetch('http://localhost:3000/api/fill-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload)
        });
        const data = await res.json();
        sendResponse({ success: true, ...data });
        return;
      }

      if (message.type === 'RECORD_SUBMISSION') {
        await fetch('http://localhost:3000/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload)
        });
        sendResponse({ success: true });
        return;
      }

      sendResponse({ status: 'unhandled_message' });
    } catch (err: any) {
      console.error('Service worker error:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});
