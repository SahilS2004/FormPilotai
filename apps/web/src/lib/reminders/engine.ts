import {
  claimDueReminders,
  createNotification,
  fetchActionableReminders,
  updateReminderRecord,
} from '../db';
import type { FormReminder } from '@formpilot/shared';

function policyLabel(policy: FormReminder['autoActionPolicy']): string {
  if (policy === 'auto_submit') return 'Auto-submit';
  if (policy === 'auto_fill_draft') return 'Auto-fill draft';
  return 'Notify only';
}

/**
 * Local stand-in for the AWS dispatcher:
 * EventBridge schedule → SQS → Lambda `formpilot-reminder-dispatcher`.
 *
 * Notify-only reminders finish here.
 * Fill and submit reminders are left in progress for the browser extension to claim.
 */
export async function processDueReminders(): Promise<{ fired: number }> {
  const due = await claimDueReminders();
  for (const reminder of due) {
    if (reminder.autoActionPolicy === 'notify_only') {
      await createNotification({
        id: `ntf_${reminder.id}`,
        reminderId: reminder.id,
        title: reminder.title,
        body: `It's time to review ${reminder.domain}. Open the form when you're ready.`,
        href: reminder.websiteUrl,
      });
      await updateReminderRecord(reminder.id, {
        status: 'auto_completed',
        executionLog: 'Notification delivered. The form was not submitted.',
        executedAt: new Date().toISOString(),
      });
      continue;
    }

    await createNotification({
      id: `ntf_${reminder.id}`,
      reminderId: reminder.id,
      title: `${policyLabel(reminder.autoActionPolicy)} is ready`,
      body: reminder.autoActionPolicy === 'auto_submit'
        ? `FormPilot will open ${reminder.domain} and submit only if every required field meets your confidence threshold.`
        : `FormPilot will open ${reminder.domain} and fill a draft for you to review.`,
      href: reminder.websiteUrl,
    });
  }
  return { fired: due.length };
}

export async function listActionableReminders(): Promise<FormReminder[]> {
  await processDueReminders();
  return fetchActionableReminders();
}
