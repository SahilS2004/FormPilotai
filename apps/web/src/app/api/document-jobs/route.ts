import { NextResponse } from 'next/server';
import { DocumentJobDocType, PersonaTone } from '@formpilot/shared';
import { runDocumentJob } from '@/lib/document-agent';
import { createDocumentJob, publicDocumentJob } from '@/lib/document-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = String(body.title || body.suggestedTitle || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Document title is required' }, { status: 400 });
    }

    const docType = (String(body.docType || 'cover_letter') as DocumentJobDocType);
    const job = await createDocumentJob({
      docType: ['cover_letter', 'statement', 'other'].includes(docType) ? docType : 'cover_letter',
      title,
      company: String(body.company || ''),
      role: String(body.role || ''),
      formHeading: String(body.formHeading || body.heading || ''),
      formUrl: String(body.formUrl || body.url || ''),
      tone: (body.tone as PersonaTone) || 'professional',
      fieldId: body.fieldId ? String(body.fieldId) : undefined,
    });

    void runDocumentJob(job.id);

    return NextResponse.json({
      jobId: job.id,
      status: job.status === 'queued' ? 'generating' : job.status,
      job: publicDocumentJob({ ...job, status: 'generating' }),
    }, { status: 201 });
  } catch (error) {
    console.error('[document-jobs POST]', error);
    return NextResponse.json({ error: 'Failed to start document job' }, { status: 500 });
  }
}
