import { NextResponse } from 'next/server';
import { fetchAllHistory, fetchHistoryById, createHistoryRecord } from '@/lib/db';
import { FormFillHistoryRecord } from '@formpilot/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const record = await fetchHistoryById(id);
    if (!record) {
      return NextResponse.json({ error: 'Submitted form not found' }, { status: 404 });
    }
    return NextResponse.json({ record });
  }

  const history = await fetchAllHistory();
  return NextResponse.json({ history });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.submitted !== true) {
      return NextResponse.json(
        { error: 'Only a submitted form is stored in history.' },
        { status: 400 }
      );
    }

    const answers = Array.isArray(body.fields) ? body.fields.filter((field: { answer?: string }) => String(field?.answer || '').trim()) : [];
    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'A submitted form needs at least one answer before it can be stored.' },
        { status: 400 }
      );
    }

    const newRecord: FormFillHistoryRecord = {
      id: `hist_${Date.now()}`,
      domain: body.domain || 'custom-site.com',
      url: body.url || '',
      formTitle: body.formTitle || 'Web Form Submission',
      submittedAt: new Date().toISOString(),
      tone: body.tone || 'professional',
      totalFieldsCount: body.totalFieldsCount || answers.length,
      filledFieldsCount: answers.length,
      wasAutoSubmitted: Boolean(body.wasAutoSubmitted),
      fields: answers
    };

    const savedRecord = await createHistoryRecord(newRecord);
    const { indexHistoryRecord } = await import('@/lib/history-index');
    await indexHistoryRecord(savedRecord);
    return NextResponse.json({ record: savedRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record history' }, { status: 500 });
  }
}
