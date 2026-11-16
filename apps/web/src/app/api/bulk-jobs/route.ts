import { NextResponse } from 'next/server';
import { fetchAllBulkJobs, createBulkJobRecord } from '@/lib/db';
import { documentsStore } from '@/lib/store';
import { BulkFormJob, BulkFormItem } from '@formpilot/shared';

export async function GET() {
  const jobs = await fetchAllBulkJobs();
  return NextResponse.json({
    jobs
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawUrls: string[] = (body.urls || [])
      .map((u: string) => u.trim())
      .filter((u: string) => u.length > 0);

    if (rawUrls.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one URL' }, { status: 400 });
    }

    const items: BulkFormItem[] = rawUrls.map((url, idx) => {
      let domain = 'web-form';
      try {
        domain = new URL(url).hostname;
      } catch {}
      return {
        id: `item_${Date.now()}_${idx}`,
        url,
        domain,
        status: 'queued',
        formTitle: `${domain} Application Form`,
        totalFieldsCount: 10 + Math.floor(Math.random() * 8),
        filledFieldsCount: 0,
        averageConfidence: 0.90 + Math.random() * 0.08
      };
    });

    const activeDocIds = (body.activeDocIds && body.activeDocIds.length > 0)
      ? body.activeDocIds
      : documentsStore.filter((d) => d.isEnabled).map((d) => d.id);

    const newJob: BulkFormJob = {
      id: `bulk_${Date.now()}`,
      name: body.name || `Batch Job - ${new Date().toLocaleDateString()}`,
      status: 'running',
      urls: items,
      autoSubmit: Boolean(body.autoSubmit),
      activeDocIds,
      tone: body.tone || 'professional',
      totalCount: items.length,
      completedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString()
    };

    const savedJob = await createBulkJobRecord(newJob);
    return NextResponse.json({ job: savedJob }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create bulk job' }, { status: 500 });
  }
}
