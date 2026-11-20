import { NextResponse } from 'next/server';
import {
  createDocumentRecord,
  fetchAllDocuments,
  getDocumentStorage,
  markDocumentIndexed,
  updateDocumentFields,
  getDbPool,
  checkPostgresHealth,
} from '@/lib/db';
import { storeDocumentVectors } from '@/lib/vector';
import { documentsStore, documentContentsStore } from '@/lib/store';
import { buildObjectKey, deleteKbObject, putKbObject } from '@/lib/object-store';
import { extractDocumentText } from '@/lib/extract-text';
import { KBDocument } from '@formpilot/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const documents = (await fetchAllDocuments()).filter((doc) => doc.sourceType !== 'snippet' && doc.sourceType !== 'history');
  return NextResponse.json({ documents });
}

async function readUpload(req: Request): Promise<{
  filename: string;
  mimeType: string;
  bytes: Buffer;
  name: string;
  description: string;
  docType: string;
  tags: string[];
}> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    const name = String(form.get('name') || '');
    const description = String(form.get('description') || '');
    const docType = String(form.get('docType') || 'general');
    const tags = String(form.get('tags') || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (file instanceof File) {
      if (file.size > MAX_BYTES) {
        throw new Error('File is larger than 25 MB');
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      return {
        filename: file.name || 'document',
        mimeType: file.type || 'application/octet-stream',
        bytes,
        name: name || file.name || 'document',
        description,
        docType,
        tags,
      };
    }

    const pasted = String(form.get('content') || description || '');
    return {
      filename: name.endsWith('.txt') ? name : `${name || 'note'}.txt`,
      mimeType: 'text/plain',
      bytes: Buffer.from(pasted, 'utf8'),
      name: name || 'Note',
      description,
      docType,
      tags,
    };
  }

  const body = await req.json();
  const filename = body.originalFilename || body.name || 'note.txt';
  const text = String(body.content || body.description || '');
  const bytes = body.fileBase64
    ? Buffer.from(String(body.fileBase64).replace(/^data:[^;]+;base64,/, ''), 'base64')
    : Buffer.from(text, 'utf8');

  return {
    filename,
    mimeType: body.mimeType || 'text/plain',
    bytes,
    name: body.name || filename,
    description: body.description || '',
    docType: body.metadata?.docType || 'general',
    tags: Array.isArray(body.metadata?.tags) ? body.metadata.tags : [],
  };
}

export async function POST(req: Request) {
  try {
    const upload = await readUpload(req);
    if (!upload.name.trim()) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 });
    }
    if (upload.bytes.length === 0) {
      return NextResponse.json({ error: 'Upload a file or paste some text' }, { status: 400 });
    }

    const docId = `doc_${Date.now()}`;
    const extracted = await extractDocumentText({
      filename: upload.filename,
      mimeType: upload.mimeType,
      bytes: upload.bytes,
      description: upload.description,
    });
    const indexText = [upload.description, extracted.text].filter((part) => part && part.trim()).join('\n\n').trim();
    if (!indexText) {
      return NextResponse.json({ error: 'Nothing to index. Add a description or a text-based file.' }, { status: 400 });
    }

    const key = buildObjectKey(docId, upload.filename);
    const stored = await putKbObject(key, upload.bytes, upload.mimeType);

    const newDoc: KBDocument = {
      id: docId,
      name: upload.name,
      originalFilename: upload.filename,
      mimeType: upload.mimeType,
      sizeBytes: upload.bytes.length,
      description: upload.description || `Reference document ${upload.filename}`,
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      s3Bucket: stored.bucket,
      s3Key: stored.key,
      storageDriver: stored.driver,
      sourceType: 'file',
      indexStatus: 'pending',
      chunkCount: 0,
    };

    await createDocumentRecord(newDoc, indexText);

    try {
      const vectorResult = await storeDocumentVectors({
        documentId: docId,
        documentName: newDoc.name,
        contentText: indexText,
        metadata: {
          docType: upload.docType,
          tags: upload.tags,
          originalFilename: upload.filename,
          mimeType: upload.mimeType,
          uploadedAt: newDoc.createdAt,
        },
      });
      await markDocumentIndexed(docId, vectorResult.chunksStored, 'indexed');
      newDoc.indexStatus = 'indexed';
      newDoc.chunkCount = vectorResult.chunksStored;

      return NextResponse.json({
        document: newDoc,
        storage: stored,
        extractionNote: extracted.note || null,
        vectorIndexing: {
          chunksStored: vectorResult.chunksStored,
          vectorDimension: vectorResult.vectorDimension,
          status: 'indexed',
        },
      }, { status: 201 });
    } catch (err) {
      console.error('[documents] vector indexing failed', err);
      await markDocumentIndexed(docId, 0, 'failed');
      newDoc.indexStatus = 'failed';
      return NextResponse.json({
        document: newDoc,
        storage: stored,
        error: 'The file is stored, but vector indexing failed. Try again in a moment.',
      }, { status: 201 });
    }
  } catch (error) {
    console.error('[API /api/documents POST error]', error);
    const message = error instanceof Error ? error.message : 'Failed to create and index document';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isEnabled, description } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    await updateDocumentFields(id, {
      isEnabled: typeof isEnabled === 'boolean' ? isEnabled : undefined,
      description: typeof description === 'string' ? description : undefined,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const storage = await getDocumentStorage(id);
    if (storage?.key) {
      await deleteKbObject(storage.bucket, storage.key);
    }

    const pool = getDbPool();
    const isHealthy = await checkPostgresHealth();
    if (isHealthy && pool) {
      await pool.query('DELETE FROM documents WHERE id = $1', [id]);
    }

    const storeIdx = documentsStore.findIndex((d) => d.id === id);
    if (storeIdx !== -1) documentsStore.splice(storeIdx, 1);
    documentContentsStore.delete(id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
