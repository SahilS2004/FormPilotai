import { NextResponse } from 'next/server';
import { getDocumentJob, publicDocumentJob, updateDocumentJob } from '@/lib/document-jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, context: { params: { id: string } }) {
  try {
    const job = await getDocumentJob(context.params.id);
    if (!job) {
      return NextResponse.json({ error: 'Document job not found' }, { status: 404 });
    }
    if (job.status === 'accepted') {
      return NextResponse.json({ error: 'Document was already accepted and saved' }, { status: 409 });
    }

    const rejected = await updateDocumentJob(job.id, {
      status: 'rejected',
      draftText: undefined,
      draftFilename: undefined,
      draftMime: undefined,
      draftBase64: undefined,
      error: undefined,
    });

    return NextResponse.json({
      job: rejected ? publicDocumentJob(rejected) : { id: job.id, status: 'rejected' },
    });
  } catch (error) {
    console.error('[document-jobs reject]', error);
    return NextResponse.json({ error: 'Failed to reject document' }, { status: 500 });
  }
}
