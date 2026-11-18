import { NextResponse } from 'next/server';
import { documentsStore, documentContentsStore } from '@/lib/store';
import { KBDocument } from '@formpilot/shared';

export async function GET() {
  return NextResponse.json({
    documents: documentsStore
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

    documentsStore.unshift(newDoc);
    if (body.content) {
      documentContentsStore.set(newDoc.id, body.content);
    }

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isEnabled, description } = await req.json();
    const doc = documentsStore.find((d) => d.id === id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (typeof isEnabled === 'boolean') {
      doc.isEnabled = isEnabled;
    }
    if (typeof description === 'string') {
      doc.description = description;
    }
    doc.updatedAt = new Date().toISOString();

    return NextResponse.json({ document: doc });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const index = documentsStore.findIndex((d) => d.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    documentsStore.splice(index, 1);
    if (id) documentContentsStore.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
