import { NextResponse } from 'next/server';
import { BulkFormItem, BulkFormJob } from '@formpilot/shared';
import { createBulkJobRecord, fetchAllBulkJobs } from '@/lib/db';
import { runBulkJob } from '@/lib/bulk-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = await fetchAllBulkJobs();
  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawUrls: string[] = (Array.isArray(body.urls) ? body.urls : [])
      .map((url: string) => String(url || '').trim())
      .filter((url: string) => url.length > 0);

    if (rawUrls.length === 0) {
      return NextResponse.json({ error: 'Paste at least one form URL.' }, { status: 400 });
    }

    const items: BulkFormItem[] = rawUrls.map((url, index) => {
      let domain = 'web-form';
      let valid = true;
      try {
        const parsed = new URL(url);
        domain = parsed.hostname;
        valid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        valid = false;
      }
      return {
        id: `item_${Date.now()}_${String(index).padStart(3, '0')}`,
        url,
        domain,
        status: valid ? 'queued' : 'failed',
        formTitle: domain,
        totalFieldsCount: 0,
        filledFieldsCount: 0,
        averageConfidence: 0,
        error: valid ? undefined : 'This is not an http or https link.',
        answers: [],
      };
    });

    const newJob: BulkFormJob = {
      id: `bulk_${Date.now()}`,
      name: String(body.name || '').trim() || `Batch Run - ${new Date().toLocaleString()}`,
      status: 'running',
      urls: items,
      autoSubmit: Boolean(body.autoSubmit),
      activeDocIds: Array.isArray(body.activeDocIds) ? body.activeDocIds.map(String) : [],
      tone: body.tone || 'professional',
      totalCount: items.length,
      completedCount: 0,
      failedCount: items.filter((item) => item.status === 'failed').length,
      createdAt: new Date().toISOString(),
    };

    const savedJob = await createBulkJobRecord(newJob);
    void runBulkJob(savedJob.id);
    return NextResponse.json({ job: savedJob }, { status: 201 });
  } catch (error) {
    console.error('[bulk-jobs POST]', error);
    return NextResponse.json({ error: 'Failed to start the fleet.' }, { status: 500 });
  }
}
