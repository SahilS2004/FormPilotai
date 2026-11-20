import { NextResponse } from 'next/server';
import { createReminderRecord, fetchAllReminders, updateReminderRecord } from '@/lib/db';
import { listActionableReminders, processDueReminders } from '@/lib/reminders/engine';
import { FormReminder } from '@formpilot/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await processDueReminders();
  const url = new URL(req.url);
  if (url.searchParams.get('actionable') === '1') {
    const reminders = await listActionableReminders();
    return NextResponse.json({ reminders });
  }
  const reminders = await fetchAllReminders();
  return NextResponse.json({ reminders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let domain = '';
    try {
      domain = new URL(body.websiteUrl).hostname;
    } catch {
      return NextResponse.json({ error: 'Enter a full website URL, including https://' }, { status: 400 });
    }

    const windowMinutes = Number(body.reminderWindowMinutes);
    const newReminder: FormReminder = {
      id: `rem_${Date.now()}`,
      websiteUrl: body.websiteUrl,
      domain,
      title: body.title || `${domain} Form Deadline`,
      deadlineTimestamp: body.deadlineTimestamp || new Date(Date.now() + 86400000).toISOString(),
      reminderWindowMinutes: Number.isFinite(windowMinutes) ? windowMinutes : 120,
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
    const body = await req.json();
    const reminder = await updateReminderRecord(body.id, {
      status: body.status,
      executionLog: body.executionLog,
      executedAt: body.executedAt,
      claim: Boolean(body.claim),
    });
    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found or already claimed' }, { status: 404 });
    }
    return NextResponse.json({ reminder });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}
