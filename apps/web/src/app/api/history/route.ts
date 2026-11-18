import { NextResponse } from 'next/server';
import { historyStore } from '@/lib/store';
import { FormFillHistoryRecord } from '@formpilot/shared';

export async function GET() {
  return NextResponse.json({
    history: historyStore
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newRecord: FormFillHistoryRecord = {
      id: `hist_${Date.now()}`,
      domain: body.domain || 'custom-site.com',
      url: body.url || '',
      formTitle: body.formTitle || 'Web Form Submission',
      submittedAt: new Date().toISOString(),
      tone: body.tone || 'professional',
      totalFieldsCount: body.totalFieldsCount || (body.fields?.length ?? 0),
      filledFieldsCount: body.filledFieldsCount || (body.fields?.length ?? 0),
      wasAutoSubmitted: Boolean(body.wasAutoSubmitted),
      fields: body.fields || []
    };

    historyStore.unshift(newRecord);
    return NextResponse.json({ record: newRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record history' }, { status: 500 });
  }
}
