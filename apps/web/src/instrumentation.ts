export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startReminderScheduler } = await import('./lib/reminders/scheduler');
    startReminderScheduler();
    const { reindexPendingDocuments } = await import('./lib/vector');
    void reindexPendingDocuments().catch((error) => {
      console.error('[reindex] knowledge base reindex failed', error);
    });
  }
}
