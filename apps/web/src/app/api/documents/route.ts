import { NextResponse } from 'next/server';
import { fetchAllDocuments, createDocumentRecord, toggleDocumentScope } from '@/lib/db';
import { documentsStore } from '@/lib/store';
import { KBDocument } from '@formpilot/shared';

export async function GET() {
  const documents = await fetchAllDocuments();
  return NextResponse.json({
    documents
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newDoc: KBDocument = {
      id: `doc_${Date.now()}`,
      name: body.name || 'Untitled_Document.pdf',
      originalFilename: body.originalFilename || 'document.pdf',
      mimeType: body.mimeType || 'application/pdf',
      sizeBytes: body.sizeBytes || 102400,
      description: body.description || 'Uploaded user document',
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedDoc = await createDocumentRecord(newDoc, body.content);
    return NextResponse.json({ document: savedDoc }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isEnabled, description } = await req.json();
    if (typeof isEnabled === 'boolean') {
      await toggleDocumentScope(id);
    }
    const doc = documentsStore.find((d) => d.id === id);
    if (doc && typeof description === 'string') {
      doc.description = description;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}
