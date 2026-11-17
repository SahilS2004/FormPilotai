let started = false;

/** Runs inside the Next.js server. In AWS this loop is EventBridge + Lambda. */
export function startReminderScheduler(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const { processDueReminders } = await import('./engine');
      const result = await processDueReminders();
      if (result.fired > 0) {
        console.info(`[reminders] fired ${result.fired}`);
      }
    } catch (err) {
      console.warn('[reminders] tick failed', err);
    }
  };

  setTimeout(tick, 4000);
  setInterval(tick, 15000);
}
