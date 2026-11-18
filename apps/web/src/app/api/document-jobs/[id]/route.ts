import { NextResponse } from 'next/server';
import { getDocumentJob, publicDocumentJob } from '@/lib/document-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, context: { params: { id: string } }) {
  const job = await getDocumentJob(context.params.id);
  if (!job) {
    return NextResponse.json({ error: 'Document job not found' }, { status: 404 });
  }
  const includeDraft = job.status === 'ready';
  return NextResponse.json({ job: publicDocumentJob(job, includeDraft) });
}
