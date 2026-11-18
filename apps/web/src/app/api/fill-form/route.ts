import { NextResponse } from 'next/server';
import { documentsStore, documentContentsStore, promptConfigStore } from '@/lib/store';
import { FormFieldMatcher, DocumentGapAnalyzer } from '@formpilot/context-engine';
import { FormSchema } from '@formpilot/shared';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema: FormSchema = body.schema;
    const tone = body.tone || promptConfigStore.tone;
    const customPromptAddons = body.customPromptAddons || promptConfigStore.customPromptAddons;

    // Filter documents based on activeDocIds if specified
    const activeDocIds: string[] | undefined = body.activeDocIds;
    const eligibleDocs = documentsStore.filter((d) => {
      if (activeDocIds && activeDocIds.length > 0) {
        return activeDocIds.includes(d.id);
      }
      return d.isEnabled;
    });

    const predictions = await FormFieldMatcher.matchFormFields({
      schema,
      documents: eligibleDocs,
      documentContents: documentContentsStore,
      config: {
        tone,
        customPromptAddons,
        userContext: promptConfigStore.userContext
      },
      fieldOverrides: body.fieldOverrides
    });

    const gapRecommendations = DocumentGapAnalyzer.analyzeGaps(schema.fields, eligibleDocs);

    return NextResponse.json({
      predictions,
      gapRecommendations,
      activeDocumentsUsed: eligibleDocs.map((d) => ({ id: d.id, name: d.name }))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process form reasoning' }, { status: 500 });
  }
}
