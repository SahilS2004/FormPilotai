export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startReminderScheduler } = await import('./lib/reminders/scheduler');
    startReminderScheduler();
    const { refreshDocumentText } = await import('./lib/refresh-documents');
    const { reindexPendingDocuments } = await import('./lib/vector');
    const { ensureSubmittedFormsIndexed } = await import('./lib/history-index');
    void refreshDocumentText()
      .then(() => reindexPendingDocuments())
      .then(() => ensureSubmittedFormsIndexed())
      .catch((error) => {
        console.error('[reindex] knowledge base reindex failed', error);
      });
  }
}
