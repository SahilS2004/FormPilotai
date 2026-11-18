import { NextResponse } from 'next/server';
import { KBDocument } from '@formpilot/shared';
import { createDocumentRecord, fetchDocumentFilePayload, markDocumentIndexed } from '@/lib/db';
import { getDocumentJob, publicDocumentJob, updateDocumentJob } from '@/lib/document-jobs';
import { composeIndexText, extractDocumentText } from '@/lib/extract-text';
import { buildObjectKey, putKbObject } from '@/lib/object-store';
import { storeDocumentVectors } from '@/lib/vector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, context: { params: { id: string } }) {
  try {
    const job = await getDocumentJob(context.params.id);
    if (!job) {
      return NextResponse.json({ error: 'Document job not found' }, { status: 404 });
    }
    if (job.status === 'accepted' && job.documentId) {
      const file = await fetchDocumentFilePayload(job.documentId);
      if (!file?.fileBase64) {
        return NextResponse.json({ error: 'Accepted document file is missing' }, { status: 404 });
      }
      return NextResponse.json({
        job: publicDocumentJob(job),
        filePayload: {
          fileName: file.originalFilename,
          mimeType: file.mimeType,
          fileBase64: file.fileBase64,
          textContent: file.contentText,
          documentId: job.documentId,
        },
      });
    }
    if (job.status !== 'ready' || !job.draftBase64) {
      return NextResponse.json({ error: 'Document is not ready to accept' }, { status: 409 });
    }

    const bytes = Buffer.from(job.draftBase64, 'base64');
    const filename = job.draftFilename || 'document.pdf';
    const mimeType = job.draftMime || 'application/pdf';
    const docId = `doc_${Date.now()}`;
    const extracted = await extractDocumentText({
      filename,
      mimeType,
      bytes,
      description: job.title,
    });
    const indexText = composeIndexText(
      `${job.title}. Written for ${[job.role, job.company].filter(Boolean).join(' at ') || 'an application'}.`,
      extracted.text || job.draftText || ''
    );

    const key = buildObjectKey(docId, filename);
    const stored = await putKbObject(key, bytes, mimeType);
    const now = new Date().toISOString();
    const document: KBDocument = {
      id: docId,
      name: job.title,
      originalFilename: filename,
      mimeType,
      sizeBytes: bytes.length,
      description: `Generated ${job.docType.replace('_', ' ')} for ${job.company || job.formHeading || 'application'}`,
      isEnabled: true,
      createdAt: now,
      updatedAt: now,
      s3Bucket: stored.bucket,
      s3Key: stored.key,
      storageDriver: stored.driver,
      sourceType: 'file',
      indexStatus: 'pending',
      chunkCount: 0,
    };

    await createDocumentRecord(document, indexText);
    try {
      const vectors = await storeDocumentVectors({
        documentId: docId,
        documentName: document.name,
        contentText: indexText,
        metadata: { docType: job.docType, generated: true, company: job.company, role: job.role },
      });
      await markDocumentIndexed(docId, vectors.chunksStored, 'indexed');
      document.indexStatus = 'indexed';
      document.chunkCount = vectors.chunksStored;
    } catch (error) {
      console.warn('[document-jobs accept] indexing failed', error);
    }

    const accepted = await updateDocumentJob(job.id, {
      status: 'accepted',
      documentId: docId,
      draftBase64: undefined,
      error: undefined,
    });

    return NextResponse.json({
      job: accepted ? publicDocumentJob(accepted) : publicDocumentJob({ ...job, status: 'accepted', documentId: docId }),
      document,
      filePayload: {
        fileName: filename,
        mimeType,
        fileBase64: job.draftBase64,
        textContent: job.draftText || indexText,
        documentId: docId,
      },
    });
  } catch (error) {
    console.error('[document-jobs accept]', error);
    return NextResponse.json({ error: 'Failed to accept document' }, { status: 500 });
  }
}
