import { NextResponse } from 'next/server';
import { fetchAllReminders, createReminderRecord } from '@/lib/db';
import { remindersStore } from '@/lib/store';
import { FormReminder } from '@formpilot/shared';

export async function GET() {
  const reminders = await fetchAllReminders();
  return NextResponse.json({
    reminders
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let domain = '';
    try {
      domain = new URL(body.websiteUrl).hostname;
    } catch {
      domain = 'custom-site.com';
    }

    const newReminder: FormReminder = {
      id: `rem_${Date.now()}`,
      websiteUrl: body.websiteUrl,
      domain,
      title: body.title || `${domain} Form Deadline`,
      deadlineTimestamp: body.deadlineTimestamp || new Date(Date.now() + 86400000).toISOString(),
      reminderWindowMinutes: body.reminderWindowMinutes || 120,
      autoActionPolicy: body.autoActionPolicy || 'notify_only',
      minConfidenceThreshold: body.minConfidenceThreshold || 0.85,
      status: 'pending',
      tone: body.tone || 'professional',
      notes: body.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedReminder = await createReminderRecord(newReminder);
    return NextResponse.json({ reminder: savedReminder }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status, executionLog } = await req.json();
    const reminder = remindersStore.find((r) => r.id === id);
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    if (status) reminder.status = status;
    if (executionLog) reminder.executionLog = executionLog;
    reminder.updatedAt = new Date().toISOString();

    return NextResponse.json({ reminder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}
