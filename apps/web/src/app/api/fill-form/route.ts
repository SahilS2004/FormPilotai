import { NextResponse } from 'next/server';
import { fetchAllDocuments, fetchDocumentFilePayload } from '@/lib/db';
import { reindexPendingDocuments, repairOversizedChunks, searchKeywordChunks, searchVectorChunks } from '@/lib/vector';
import { extractDocumentLinks } from '@/lib/document-formatter';
import { pastFormAnswers } from '@/lib/history-index';
import { embedTexts, reasonAboutForm, FormFact, GeminiFieldAnswer } from '@/lib/gemini';
import { FormSchema, FormField, PredictedFieldValue, KBDocument, VectorDocumentChunk, PersonaTone, DocumentRecommendation } from '@formpilot/shared';
import { ONBOARDING_DOC_ID } from '@/lib/onboarding-profile';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema: FormSchema = body.schema;
    if (!schema || !schema.fields) {
      return NextResponse.json({ error: 'Invalid schema payload' }, { status: 400 });
    }

    const fieldOverrides: Record<string, string> = body.fieldOverrides || {};
    const tone: PersonaTone = body.tone || 'professional';

    const allDocs = (await fetchAllDocuments()).filter((doc) => doc.sourceType !== 'history');
    const activeDocIds: string[] | undefined = body.activeDocIds;
    let eligibleDocs = allDocs.filter((d) => {
      if (activeDocIds && activeDocIds.length > 0) {
        return activeDocIds.includes(d.id);
      }
      return d.isEnabled;
    });
    if (eligibleDocs.length === 0) {
      eligibleDocs = allDocs.filter((d) => d.isEnabled !== false);
    }

    await reindexPendingDocuments();
    await repairOversizedChunks();

    const predictions: PredictedFieldValue[] = [];
    const missingDocs: DocumentRecommendation[] = [];
    const docIds = eligibleDocs.map((doc) => doc.id).filter((id) => id !== ONBOARDING_DOC_ID);
    const units: Array<{ unit: FieldUnit; kind: FieldKind }> = [];

    for (const unit of groupFields(schema.fields)) {
      const field = unit.question;

      if (fieldOverrides[field.id] !== undefined && unit.kind === 'single') {
        predictions.push({
          fieldId: field.id,
          selector: field.selector,
          placeholder: field.placeholder,
          value: fieldOverrides[field.id],
          confidence: 1.0,
          confidenceLevel: 'high',
          rationale: 'User manual override'
        });
        continue;
      }

      if (field.type === 'file') {
        const targetDoc = await chooseUploadDocument(field, schema, eligibleDocs);
        if (targetDoc) {
          const fileData = await fetchDocumentFilePayload(targetDoc.id);
          const fileName = fileData?.originalFilename || targetDoc.originalFilename || targetDoc.name;
          const mimeType = fileData?.mimeType || targetDoc.mimeType || 'application/pdf';

          predictions.push({
            fieldId: field.id,
            selector: field.selector,
            placeholder: field.placeholder,
            value: fileName,
            confidence: 0.92,
            confidenceLevel: 'high',
            rationale: `Selected “${targetDoc.name}” for this upload from the knowledge base.`,
            citation: {
              documentId: targetDoc.id,
              documentName: targetDoc.name,
              excerpt: targetDoc.description
            },
            filePayload: {
              fileName,
              mimeType,
              fileBase64: fileData?.fileBase64,
              textContent: fileData?.contentText || targetDoc.description,
              documentId: targetDoc.id
            }
          });
        } else {
          const generate = generatableUpload(field);
          missingDocs.push({
            missingDocumentName: field.label || generate.suggestedTitle,
            description: generate.suggestedTitle,
            reason: generate.canGenerate
              ? `FormPilot can draft a ${generate.suggestedTitle.toLowerCase()} for this upload.`
              : `Field "${field.label}" needs a file from the knowledge base.`,
            targetedFields: [field.id],
            canGenerate: generate.canGenerate,
            docType: generate.docType,
            suggestedTitle: generate.suggestedTitle,
            fieldId: field.id,
          });

          predictions.push({
            fieldId: field.id,
            selector: field.selector,
            placeholder: field.placeholder,
            value: '',
            confidence: 0.2,
            confidenceLevel: 'low',
            rationale: 'No matching document is in the knowledge base.',
            missingDocHint: generate.canGenerate
              ? 'FormPilot can generate this document for review.'
              : 'Upload your document in Knowledge Base to attach automatically'
          });
        }
        continue;
      }

      units.push({ unit, kind: classifyField(field) });
    }

    const [documentLinks, pastAnswers, queryVectors] = await Promise.all([
      loadDocumentLinks(eligibleDocs),
      pastFormAnswers(),
      units.length > 0
        ? embedTexts(units.map(({ unit, kind }) => questionQuery(unit.question, kind))).catch((error) => {
          console.warn('[fill] query embedding failed', error);
          return [] as number[][];
        })
        : Promise.resolve([] as number[][]),
    ]);

    const historyChunk: VectorDocumentChunk | null = pastAnswers.length > 0 ? {
      id: 'history',
      documentId: 'history',
      documentName: 'Previous form answers',
      chunkIndex: 0,
      content: pastAnswers.join('\n'),
      metadata: {},
      similarity: 0.5,
    } : null;

    const pending = await Promise.all(units.map(async ({ unit, kind }, index) => {
      const retrieved = await retrieveForField(unit.question, kind, docIds, queryVectors[index]);
      return { unit, kind, retrieved: historyChunk ? [...retrieved, historyChunk] : retrieved };
    }));

    const facts = collectFacts(pending.map((item) => item.retrieved.filter((chunk) => chunk.documentId !== 'history')));
    let modelAnswers = new Map<string, GeminiFieldAnswer>();
    if (pending.length > 0) {
      try {
        const answers = await reasonAboutForm({
          heading: (schema.title || '').slice(0, 300),
          tone,
          questions: pending.map(({ unit, retrieved }) => ({
            id: unit.question.id,
            label: unit.question.label || unit.question.name || unit.question.placeholder || 'Question',
            type: unit.kind === 'choice' && unit.multiple ? 'checkbox group' : unit.question.type,
            ...(unit.question.options?.length ? { options: unit.question.options.map((option) => option.value || option.label) } : {}),
            facts: facts.idsFor(retrieved),
          })),
          facts: facts.list,
          pastAnswers,
          links: documentLinks.slice(0, 20).map((link) => `${link.label}: ${link.url}`),
        });
        modelAnswers = new Map(answers.map((answer) => [answer.fieldId, answer]));
      } catch (error) {
        console.warn('[fill] Gemini reasoning unavailable, using retrieved passages', error);
      }
    }

    for (const item of pending) {
      const answer = modelAnswers.get(item.unit.question.id);
      const fromModel = predictionsFromModel(item.unit, answer, citationFor(answer, facts, historyChunk, documentLinks));
      if (fromModel) {
        predictions.push(...fromModel);
        continue;
      }
      if (item.unit.kind === 'choice') {
        predictions.push(...answerChoice(item.unit, item.retrieved));
        continue;
      }
      const grounded = shapeForControl(
        item.unit.question,
        answerFromChunks(item.kind, item.retrieved, item.unit.question),
        item.retrieved,
        documentLinks,
        schema
      );
      predictions.push({
        fieldId: item.unit.question.id,
        selector: item.unit.question.selector,
        placeholder: item.unit.question.placeholder,
        value: grounded.value,
        confidence: grounded.confidence,
        confidenceLevel: grounded.confidence >= 0.9 ? 'high' : grounded.confidence >= 0.5 ? 'medium' : 'low',
        rationale: grounded.rationale,
        citation: grounded.citation,
      });
    }

    return NextResponse.json({
      predictions,
      gapRecommendations: missingDocs,
      activeDocumentsUsed: eligibleDocs.map((d) => ({ id: d.id, name: d.name }))
    });
  } catch (error) {
    console.error('[API /api/fill-form POST error]', error);
    return NextResponse.json({ error: 'Failed to process agentic form reasoning' }, { status: 500 });
  }
}

type Citation = NonNullable<PredictedFieldValue['citation']>;

function collectFacts(perField: VectorDocumentChunk[][]) {
  const list: FormFact[] = [];
  const idByKey = new Map<string, string>();
  const chunkById = new Map<string, VectorDocumentChunk>();
  const keyOf = (chunk: VectorDocumentChunk) => `${chunk.documentId}:${chunk.chunkIndex}`;

  for (let rank = 0; rank < 5; rank += 1) {
    for (const chunks of perField) {
      const chunk = chunks[rank];
      if (!chunk || idByKey.has(keyOf(chunk)) || list.length >= 36) continue;
      const profile = chunk.documentId === ONBOARDING_DOC_ID;
      const id = `${profile ? 'P' : 'D'}${list.length + 1}`;
      idByKey.set(keyOf(chunk), id);
      chunkById.set(id, chunk);
      list.push({
        id,
        source: profile ? 'Profile' : chunk.documentName,
        text: chunk.content.replace(/\s+/g, ' ').trim().slice(0, 700),
      });
    }
  }

  return {
    list,
    chunkById,
    idsFor: (chunks: VectorDocumentChunk[]) => chunks
      .map((chunk) => idByKey.get(keyOf(chunk)))
      .filter((id): id is string => Boolean(id))
      .slice(0, 5),
  };
}

function citationFor(
  answer: GeminiFieldAnswer | undefined,
  facts: ReturnType<typeof collectFacts>,
  historyChunk: VectorDocumentChunk | null,
  links: DocumentLink[]
): Citation | undefined {
  if (!answer?.value) return undefined;
  const source = answer.source.replace(/[\[\]]/g, '').trim().toUpperCase();
  const chunk = facts.chunkById.get(source);
  if (chunk) {
    return {
      documentId: chunk.documentId,
      documentName: chunk.documentId === ONBOARDING_DOC_ID ? 'Profile' : chunk.documentName,
      excerpt: chunk.content.replace(/\s+/g, ' ').trim().slice(0, 180),
    };
  }
  if (source === 'H' && historyChunk) {
    const line = historyChunk.content.split('\n').find((item) => item.toLowerCase().includes(answer.value.toLowerCase()));
    return { documentId: 'history', documentName: 'Previous form answers', excerpt: (line || '').slice(0, 180) };
  }
  if (source === 'L') {
    const link = links.find((item) => item.url === answer.value);
    if (link) return link.citation;
  }
  return undefined;
}

type ChoiceUnit = {
  kind: 'choice';
  question: FormField;
  members: FormField[];
  multiple: boolean;
};

type FieldUnit = { kind: 'single'; question: FormField } | ChoiceUnit;

function groupFields(fields: FormField[]): FieldUnit[] {
  const used = new Set<number>();
  const units: FieldUnit[] = [];

  fields.forEach((field, index) => {
    if (used.has(index)) return;
    const sharesName = (field.type === 'radio' || field.type === 'checkbox') && Boolean(field.name);
    if (sharesName) {
      const memberIndexes = fields
        .map((item, itemIndex) => ({ item, itemIndex }))
        .filter(({ item }) => item.type === field.type && item.name === field.name);
      if (memberIndexes.length > 1) {
        memberIndexes.forEach(({ itemIndex }) => used.add(itemIndex));
        const members = memberIndexes.map(({ item }) => item);
        const labels = members.map((item) => item.label).filter(Boolean);
        units.push({
          kind: 'choice',
          multiple: field.type === 'checkbox',
          members,
          question: {
            ...members[0],
            label: choiceQuestion(labels),
            options: members.map((item) => ({
              label: item.label,
              value: item.label,
              selector: item.selector,
            })),
          },
        });
        return;
      }
    }

    if ((field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') && (field.options?.length || 0) > 1) {
      units.push({
        kind: 'choice',
        multiple: field.type === 'checkbox',
        members: [field],
        question: field,
      });
      return;
    }

    units.push({ kind: 'single', question: field });
  });

  return units;
}

function usableAnswer(field: FormField, raw: string): string {
  let text = raw.trim();
  if (field.type !== 'textarea') {
    text = text.replace(/\s+/g, ' ');
    const labeled = text.match(/^[^:]{2,40}:\s*(.+)$/);
    if (labeled && !/^https?$/i.test(text.split(':')[0]) && labeled[1].trim().length > 0) {
      text = labeled[1].trim();
    }
  }
  const limit = field.type === 'textarea' ? 2000 : 300;
  if (!text || text.length > limit) return '';
  return text;
}

function predictionsFromModel(
  unit: FieldUnit,
  answer: GeminiFieldAnswer | undefined,
  citation: Citation | undefined
): PredictedFieldValue[] | null {
  const value = usableAnswer(unit.question, answer?.value || '');
  if (!answer || !value) return null;
  const confidence = answer.confidence || 0.8;
  const rationale = citation ? `Answered from ${citation.documentName}.` : 'Answered from your saved facts.';

  if (unit.kind === 'single') {
    return [{
      fieldId: unit.question.id,
      selector: unit.question.selector,
      placeholder: unit.question.placeholder,
      value,
      confidence,
      confidenceLevel: confidence >= 0.9 ? 'high' : confidence >= 0.5 ? 'medium' : 'low',
      rationale,
      citation,
    }];
  }

  const wanted = new Set(value.split('|').map((part) => part.trim().toLowerCase()).filter(Boolean));
  const options = unit.question.options || [];
  const winners = options.filter((option) => wanted.has((option.value || '').toLowerCase()) || wanted.has(option.label.toLowerCase()));
  if (winners.length === 0) return null;
  if (unit.members.length === 1) {
    const winner = winners[0];
    return [{
      fieldId: unit.question.id,
      selector: winner.selector || unit.question.selector,
      placeholder: unit.question.placeholder,
      value: unit.question.type === 'select' ? winner.value || winner.label : winner.value || 'true',
      confidence,
      confidenceLevel: confidence >= 0.9 ? 'high' : 'medium',
      rationale,
      citation,
    }];
  }
  return unit.members.map((member) => {
    const winner = winners.find((option) => option.label === member.label);
    return {
      fieldId: member.id,
      selector: member.selector,
      placeholder: member.placeholder,
      value: winner ? 'true' : '',
      confidence: winner ? confidence : 0.2,
      confidenceLevel: winner ? 'medium' : 'low',
      rationale: winner ? rationale : 'No option matched the knowledge base for this question.',
      citation: winner ? citation : undefined,
    };
  });
}

function choiceQuestion(labels: string[]): string {
  const blob = labels.join(' ');
  if (/fresher|year|experience/i.test(blob)) return 'Relevant experience internships';
  return `Choose one of ${labels.join(', ')}`;
}

async function retrieveForField(field: FormField, kind: FieldKind, docIds: string[], queryEmbedding?: number[]): Promise<VectorDocumentChunk[]> {
  const query = questionQuery(field, kind).slice(0, 1800);
  const terms = questionTerms(field, kind);
  const [chunks, profileChunks, keywordChunks] = await Promise.all([
    docIds.length > 0 ? searchVectorChunks({ query, queryEmbedding, topK: 6, filterDocIds: docIds }) : Promise.resolve([]),
    searchVectorChunks({ query, queryEmbedding, topK: 2, filterDocIds: [ONBOARDING_DOC_ID] }),
    searchKeywordChunks({
      terms,
      filterDocIds: [...docIds, ONBOARDING_DOC_ID],
      limit: 6,
    }),
  ]);
  const seen = new Set<string>();
  return [...keywordChunks.slice(0, 2), ...profileChunks, ...chunks, ...keywordChunks.slice(2)].filter((chunk) => {
    const key = `${chunk.documentId}:${chunk.chunkIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function answerChoice(unit: ChoiceUnit, chunks: VectorDocumentChunk[]): PredictedFieldValue[] {
  const options = unit.question.options || [];
  const text = chunks.map((chunk) => chunk.content).join('\n');
  const top = chunks[0];
  const citation = top ? {
    documentId: top.documentId,
    documentName: top.documentName,
    excerpt: top.content.replace(/\s+/g, ' ').trim().slice(0, 180),
  } : undefined;
  const years = experienceYears(text);
  let selected = unit.multiple ? [] : pickYearOption(options, years);

  if (selected.length === 0) {
    const scored = options
      .map((option) => ({ option, score: optionScore(option.label, text) }))
      .filter((item) => item.score >= 0.67)
      .sort((a, b) => b.score - a.score);
    if (unit.multiple) selected = scored.map((item) => item.option);
    else if (scored[0] && (!scored[1] || scored[0].score > scored[1].score)) selected = [scored[0].option];
  }

  const blankReason = 'No option matched the knowledge base for this question.';
  if (unit.members.length === 1) {
    const winner = selected[0];
    return [{
      fieldId: unit.question.id,
      selector: winner?.selector || unit.question.selector,
      placeholder: unit.question.placeholder,
      value: winner ? (unit.question.type === 'select' ? winner.value || winner.label : winner.value || 'true') : '',
      confidence: winner ? 0.84 : 0.2,
      confidenceLevel: winner ? 'medium' : 'low',
      rationale: winner ? `Selected “${winner.label}” for this question.` : blankReason,
      citation: winner ? citation : undefined,
    }];
  }

  return unit.members.map((member) => {
    const winner = selected.find((option) => option.label === member.label);
    return {
      fieldId: member.id,
      selector: member.selector,
      placeholder: member.placeholder,
      value: winner ? 'true' : '',
      confidence: winner ? 0.84 : 0.2,
      confidenceLevel: winner ? 'medium' : 'low',
      rationale: winner ? `Selected “${member.label}” for this question.` : blankReason,
      citation: winner ? citation : undefined,
    };
  });
}

function pickYearOption(options: NonNullable<FormField['options']>, years: number | null) {
  if (years == null) return [];
  if (years < 0.25) {
    const fresher = options.find((option) => /fresher|no experience|none/i.test(option.label));
    if (fresher) return [fresher];
  }
  const ranges = options
    .map((option) => ({ option, span: optionSpan(option.label) }))
    .filter((item): item is { option: NonNullable<FormField['options']>[number]; span: { min: number; max: number } } => Boolean(item.span));
  if (ranges.length === 0) return [];
  const upper = Math.max(...ranges.map((item) => item.span.max));
  const fits = ranges.filter((item) => years >= item.span.min && (item.span.max === upper ? years <= item.span.max : years < item.span.max));
  return fits.length > 0 ? [fits[0].option] : [];
}

function optionSpan(label: string): { min: number; max: number } | null {
  const text = label.toLowerCase().replace(/[–—]/g, '-');
  if (/\bfresher\b|\bno experience\b|\bnone\b/.test(text)) return null;
  const plus = text.match(/(\d+(?:\.\d+)?)\s*\+/);
  if (plus) return { min: Number(plus[1]), max: 80 };
  const range = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  return null;
}

function optionScore(label: string, text: string): number {
  const stop = new Set(['year', 'years', 'the', 'and', 'with']);
  const words = label.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word));
  if (words.length === 0) return 0;
  const hits = words.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text)).length;
  return hits / words.length;
}

function experienceYears(text: string): number | null {
  const pattern = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2})\s*[-–—to]+\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(20\d{2}|present|current|now)/gi;
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  let found = false;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    const around = text.slice(Math.max(0, index - 90), index + match[0].length);
    if (/education|school|class|cgpa|degree|matriculation|bachelor|intermediate/i.test(around)
      && !/intern|employ|worked|developer|engineer/i.test(around)) continue;
    if (!/intern|employ|worked|experience|developer|engineer|role/i.test(around)) continue;
    const from = yearValue(match[1], match[2]);
    const to = /present|current|now/i.test(match[4]) ? 2026 + 10 / 12 : yearValue(match[3], match[4]);
    if (from == null || to == null || to < from) continue;
    start = Math.min(start, from);
    end = Math.max(end, to);
    found = true;
  }
  return found ? end - start : null;
}

function yearValue(month: string | undefined, year: string): number | null {
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const numericYear = Number(year);
  if (!numericYear) return null;
  const key = (month || '').slice(0, 3).toLowerCase();
  return numericYear + (months[key] ?? 0) / 12;
}

type DocumentLink = {
  url: string;
  label: string;
  citation: NonNullable<PredictedFieldValue['citation']>;
};

const linkCache = new Map<string, DocumentLink[]>();

async function loadDocumentLinks(docs: KBDocument[]): Promise<DocumentLink[]> {
  const sources = docs.filter((doc) => doc.id !== ONBOARDING_DOC_ID && doc.sourceType !== 'snippet' && doc.sourceType !== 'history');
  const perDoc = await Promise.all(sources.map(async (doc) => {
    const cacheKey = `${doc.id}:${doc.updatedAt}`;
    const cached = linkCache.get(cacheKey);
    if (cached) return cached;
    const links: DocumentLink[] = [];
    try {
      const payload = await fetchDocumentFilePayload(doc.id);
      if (payload?.fileBase64) {
        const found = await extractDocumentLinks(payload.originalFilename, payload.mimeType, Buffer.from(payload.fileBase64, 'base64'));
        for (const link of found) {
          const label = link.context ? `${link.label} (${link.context})` : link.label;
          links.push({
            url: link.url,
            label,
            citation: { documentId: doc.id, documentName: doc.name, excerpt: `${label}: ${link.url}` },
          });
        }
      }
      linkCache.set(cacheKey, links);
    } catch (error) {
      console.warn('[loadDocumentLinks]', error);
    }
    return links;
  }));
  const seen = new Set<string>();
  return perDoc.flat().filter((link) => {
    if (seen.has(link.url)) return false;
    seen.add(link.url);
    return true;
  });
}

function generatableUpload(field: FormField): {
  canGenerate: boolean;
  docType: 'cover_letter' | 'statement' | 'other';
  suggestedTitle: string;
} {
  const label = `${field.label || ''} ${field.name || ''} ${field.placeholder || ''}`.toLowerCase();
  if (/cover\s*letter|motivation\s*letter|letter\s*of\s*interest/.test(label)) {
    return { canGenerate: true, docType: 'cover_letter', suggestedTitle: 'Cover Letter' };
  }
  if (/statement\s*of\s*purpose|\bsop\b|personal\s*statement|why\s*us|interest\s*statement/.test(label)) {
    return { canGenerate: true, docType: 'statement', suggestedTitle: 'Personal Statement' };
  }
  if (/upload|attach|document|file/.test(label) && /letter|statement|essay|write.?up/.test(label)) {
    return { canGenerate: true, docType: 'other', suggestedTitle: field.label || 'Application Document' };
  }
  return { canGenerate: false, docType: 'other', suggestedTitle: field.label || 'Document' };
}

async function chooseUploadDocument(field: FormField, schema: FormSchema, docs: KBDocument[]): Promise<KBDocument | undefined> {
  const library = docs.filter((doc) => doc.id !== ONBOARDING_DOC_ID && doc.sourceType !== 'snippet' && doc.sourceType !== 'history');
  const label = `${field.label || ''} ${field.name || ''}`.toLowerCase();
  const narrowed = library.filter((doc) => {
    const blob = `${doc.name} ${doc.description || ''}`.toLowerCase();
    if (/resume|cv/.test(label)) return /resume|cv/.test(blob);
    if (/tax|w-?2|1099/.test(label)) return /tax|w-?2|1099/.test(blob);
    if (/passport|identity|\bid\b/.test(label)) return /passport|identity|\bid\b/.test(blob);
    return true;
  });
  const candidates = narrowed.length > 0 ? narrowed : library;
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const chunks = await searchVectorChunks({
    query: `${schema.title} ${schema.url} ${field.label || 'upload document'}`,
    topK: 8,
    filterDocIds: candidates.map((doc) => doc.id),
  });
  const best = new Map<string, number>();
  for (const chunk of chunks) {
    best.set(chunk.documentId, Math.max(best.get(chunk.documentId) || 0, Number(chunk.similarity) || 0));
  }
  return [...candidates].sort((a, b) => (best.get(b.id) || 0) - (best.get(a.id) || 0))[0];
}

function chooseLink(links: DocumentLink[], field: FormField, schema: FormSchema): DocumentLink | null {
  const label = `${field.label || ''} ${field.placeholder || ''}`.toLowerCase();
  const scored = links
    .map((link) => ({ link, score: scoreLink(link.url, link.label, label, schema) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.link || null;
}

function scoreLink(url: string, linkLabel: string, label: string, schema: FormSchema): number {
  if (/mailto:/i.test(url)) return 0;
  if (/linkedin/.test(label)) return /linkedin\.com/i.test(url) ? 10 : 0;
  if (/portfolio/.test(label) && !/project/.test(label)) return /portfolio|vercel\.app/i.test(url) ? 8 : 0;
  if (/github/.test(label) && !/project/.test(label)) {
    if (/github\.com\/[^/]+\/?$/i.test(url)) return 8;
    return /github\.com/i.test(url) ? 3 : 0;
  }

  let score = /github\.com\/[^/]+\/[^/]+/i.test(url) ? 2 : 1;
  if (/linkedin\.com/i.test(url)) score -= 4;
  try {
    const parsed = new URL(url);
    const form = new URL(schema.url);
    if (parsed.host === form.host && parsed.pathname.startsWith('/forms/')) score -= 8;
  } catch {
    return 0;
  }
  const tokens = `${schema.title} ${label}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  const ignore = new Set(['link', 'relevant', 'project', 'your', 'with', 'this', 'http', 'https', 'website']);
  const haystack = `${url} ${linkLabel}`.toLowerCase();
  for (const token of tokens) {
    if (!ignore.has(token) && haystack.includes(token)) score += 5;
  }
  return score;
}

function shapeForControl(
  field: FormField,
  grounded: { value: string; confidence: number; rationale: string; citation?: PredictedFieldValue['citation'] },
  chunks: VectorDocumentChunk[],
  links: DocumentLink[],
  schema: FormSchema
) {
  const label = `${field.label || ''} ${field.placeholder || ''}`.toLowerCase();
  const corpus = chunks.map((chunk) => chunk.content).join('\n');
  const citation = chunks[0] ? {
    documentId: chunks[0].documentId,
    documentName: chunks[0].documentName,
    excerpt: chunks[0].content.replace(/\s+/g, ' ').trim().slice(0, 180),
  } : undefined;
  const blank = {
    value: '',
    confidence: 0.2,
    rationale: `No matching ${field.label || 'value'} is in the knowledge base.`,
    citation: undefined as PredictedFieldValue['citation'],
  };

  if (field.type === 'radio' || field.type === 'checkbox' || field.type === 'select') return blank;
  if ((field.type === 'textarea' || field.type === 'text') && /technolog|skill|stack|language|tool/.test(label)) {
    const skills = technologiesFrom(chunks);
    if (skills) {
      return { value: skills.value, confidence: 0.84, rationale: 'Technologies retrieved for this question.', citation: skills.citation };
    }
  }
  if (field.type !== 'textarea' && /link|url|website|portfolio|github|linkedin/.test(label)) {
    const chosen = chooseLink(links, field, schema);
    if (chosen) {
      return { value: chosen.url, confidence: 0.9, rationale: 'Link retrieved for this question.', citation: chosen.citation };
    }
  }
  if (field.type === 'date' || /\bdate\b|dob|birth/.test(label)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(grounded.value)) return grounded;
    const iso = corpus.match(/\b(19|20)\d{2}-\d{2}-\d{2}\b/)?.[0] || '';
    return iso
      ? { value: iso, confidence: 0.8, rationale: 'Date retrieved for this question.', citation }
      : blank;
  }
  if (field.type === 'number') {
    if (/^\d+(\.\d+)?$/.test(grounded.value.trim())) return grounded;
    const years = /year|experience/.test(label) ? experienceYears(corpus) : null;
    if (years != null) {
      return { value: String(Math.round(years * 10) / 10), confidence: 0.8, rationale: 'Number retrieved for this question.', citation };
    }
    const labeled = corpus.match(new RegExp(`(?:${labelTerms(field).join('|')})\\D{0,12}(\\d+(?:\\.\\d+)?)`, 'i'))?.[1];
    return labeled
      ? { value: labeled, confidence: 0.75, rationale: 'Number retrieved for this question.', citation }
      : blank;
  }
  return grounded;
}

function technologiesFrom(chunks: VectorDocumentChunk[]): { value: string; citation: PredictedFieldValue['citation'] } | null {
  const known = [
    'TypeScript', 'JavaScript', 'Python', 'Java', 'SQL', 'HTML', 'CSS',
    'React Native', 'React', 'Next.js', 'Node.js', 'Express', 'FastAPI',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Firebase', 'Docker', 'Kubernetes',
    'PyTorch', 'TensorFlow', 'Tailwind', 'RAG',
  ];
  const count = (content: string) => known.filter((name) => new RegExp(name.replace('.', '\\.'), 'i').test(content)).length;
  const ranked = [...chunks].sort((a, b) => count(b.content) - count(a.content));
  const best = ranked[0];
  if (!best || count(best.content) < 3) return null;
  const found = known.filter((name) => new RegExp(name.replace('.', '\\.'), 'i').test(best.content));
  return {
    value: found.join(', '),
    citation: {
      documentId: best.documentId,
      documentName: best.documentName,
      excerpt: best.content.replace(/\s+/g, ' ').trim().slice(0, 180),
    },
  };
}

function questionQuery(field: FormField, kind: FieldKind): string {
  const label = [field.label, field.name, field.placeholder].filter(Boolean).join(' ');
  const hint: Partial<Record<FieldKind, string>> = {
    email: 'email address',
    phone: 'phone mobile number',
    full_name: 'full name of the person',
    first_name: 'first name',
    last_name: 'last name',
    role: 'profession job title role',
    company: 'company employer',
    city: 'city location',
    state: 'state location',
    website: 'website portfolio url',
    summary: 'experience skills summary',
  };
  return `${hint[kind] || ''} ${label}`.trim();
}

function labelTerms(field: FormField): string[] {
  const stop = new Set(['your', 'the', 'and', 'for', 'with', 'this', 'type', 'please', 'enter', 'what', 'are', 'you', 'will']);
  const label = [field.label, field.name].filter(Boolean).join(' ');
  return Array.from(new Set(
    label.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word))
  ));
}

function questionTerms(field: FormField, kind: FieldKind): string[] {
  const fromLabel = labelTerms(field);
  const label = `${field.label || ''} ${field.placeholder || ''}`.toLowerCase();
  if (/technolog|skill|stack|language|tool/.test(label)) fromLabel.push('skills', 'react', 'python', 'node', 'javascript', 'frontend');
  if (/project/.test(label)) fromLabel.push('project');
  if (/experience|intern|fresher/.test(label)) fromLabel.push('internship', 'experience');
  const unique = Array.from(new Set(fromLabel));
  if (unique.length > 0) return unique;
  const stop = new Set(['your', 'the', 'and', 'for', 'with', 'this', 'type', 'please', 'enter', 'what', 'are', 'you']);
  return Array.from(new Set(
    questionQuery(field, kind).toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !stop.has(word))
  ));
}

function bestChunk(chunks: VectorDocumentChunk[], field: FormField, kind: FieldKind) {
  const terms = questionTerms(field, kind);
  return [...chunks].sort((a, b) => {
    const generic = new Set(['number', 'name', 'role', 'title', 'city', 'text', 'address']);
    const hits = (chunk: VectorDocumentChunk) => terms.reduce((score, term) => {
      if (!generic.has(term) && new RegExp(`^${term}$`, 'im').test(chunk.content)) return score + 5;
      if (new RegExp(`\\b${term}\\b`, 'i').test(chunk.content)) return score + 1;
      return score;
    }, 0);
    return hits(b) - hits(a) || Number(b.similarity || 0) - Number(a.similarity || 0);
  })[0];
}

function answerFromChunks(kind: FieldKind, chunks: VectorDocumentChunk[], field: FormField) {
  const top = bestChunk(chunks, field, kind);
  const context = top?.content || '';
  const similarity = Number(top?.similarity || 0);
  const terms = questionTerms(field, kind);
  const overlap = terms.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(context)).length;
  const citation = top ? {
    documentId: top.documentId,
    documentName: top.documentName,
    excerpt: top.content.replace(/\s+/g, ' ').trim().slice(0, 180),
  } : undefined;
  const blank = {
    value: '',
    confidence: 0.2,
    rationale: `No passage matched “${field.label || field.name || 'this question'}”.`,
    citation: undefined as typeof citation,
  };

  if (kind === 'email') {
    let accountEmail: { value: string; citation: NonNullable<typeof citation> } | null = null;
    for (const chunk of chunks) {
      if (!/\bemail\b/i.test(chunk.content)) continue;
      const value = chunk.content.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || '';
      if (!value) continue;
      const found = {
        value,
        citation: {
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          excerpt: chunk.content.replace(/\s+/g, ' ').trim().slice(0, 180),
        },
      };
      if (chunk.documentId !== ONBOARDING_DOC_ID) {
        return { ...found, confidence: 0.95, rationale: 'Email retrieved for this question.' };
      }
      accountEmail = found;
    }
    return accountEmail
      ? { ...accountEmail, confidence: 0.9, rationale: 'Email retrieved from the onboarding profile.' }
      : blank;
  }
  if (kind === 'phone') {
    for (const chunk of chunks) {
      const value = chunk.content.match(/(?:phone|mobile|tel)\s*:?\s*(\+?\d[\d\s().-]{8,}\d)/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      if (!value) continue;
      return {
        value,
        confidence: 0.9,
        rationale: 'Phone number retrieved for this question.',
        citation: {
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          excerpt: chunk.content.replace(/\s+/g, ' ').trim().slice(0, 180),
        },
      };
    }
    return blank;
  }
  if (kind === 'full_name' || kind === 'first_name' || kind === 'last_name') {
    let chosen = '';
    let chosenChunk = top;
    for (const chunk of chunks) {
      const profile = buildProfile(chunk.content);
      const value = kind === 'first_name' ? profile.firstName : kind === 'last_name' ? profile.lastName : profile.fullName;
      if (!value) continue;
      const improves = !chosen || (value.includes(' ') && !chosen.includes(' '));
      if (improves) {
        chosen = value;
        chosenChunk = chunk;
      }
    }
    if (!chosen || !chosenChunk) return blank;
    return {
      value: chosen,
      confidence: 0.9,
      rationale: 'Name retrieved for this question.',
      citation: {
        documentId: chosenChunk.documentId,
        documentName: chosenChunk.documentName,
        excerpt: chosenChunk.content.replace(/\s+/g, ' ').trim().slice(0, 180),
      },
    };
  }
  const factLabels: Partial<Record<FieldKind, string[]>> = {
    dob: ['date of birth', 'dob', 'birth date'],
    gender: ['gender', 'sex'],
    postal: ['postal code', 'zip code', 'pincode', 'postcode'],
    country: field.label?.toLowerCase().includes('national') ? ['nationality', 'citizenship', 'country'] : ['country', 'nationality'],
    address: ['street address', 'address'],
    city: ['city'],
    state: ['state', 'province'],
  };
  const labels = factLabels[kind];
  if (labels) {
    for (const label of labels) {
      for (const chunk of chunks) {
        const match = chunk.content.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*(.+)`, 'i'));
        if (!match?.[1]) continue;
        return {
          value: match[1].trim(),
          confidence: 0.9,
          rationale: 'Retrieved from user_basic_info for this question.',
          citation: {
            documentId: chunk.documentId,
            documentName: chunk.documentName,
            excerpt: match[0].trim().slice(0, 180),
          },
        };
      }
    }
    return blank;
  }
  if (kind === 'role' || kind === 'company' || kind === 'city' || kind === 'state' || kind === 'website') {
    for (const chunk of chunks) {
      const profile = buildProfile(chunk.content);
      const value = {
        role: profile.role,
        company: profile.company,
        city: profile.city || profile.location,
        state: profile.state,
        website: profile.website,
      }[kind];
      if (!value) continue;
      return {
        value,
        confidence: 0.86,
        rationale: 'Retrieved from the passage for this question.',
        citation: {
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          excerpt: chunk.content.replace(/\s+/g, ' ').trim().slice(0, 180),
        },
      };
    }
  }
  const weak = new Set(['current', 'name', 'your', 'the', 'number', 'type', 'total', 'please', 'what', 'which', 'form', 'submitted']);
  const specific = terms.filter((term) => !weak.has(term));
  const scored = specific.length > 0 ? specific : terms;
  const needed = scored.length <= 1 ? 1 : 2;
  let labeledMatch: { hits: number; value: string; documentId: string; documentName: string; excerpt: string } | null = null;
  for (const chunk of chunks) {
    for (const line of chunk.content.split('\n')) {
      const labeled = line.match(/^([^:]{2,80}):\s*(.+)$/);
      if (!labeled) continue;
      const hits = scored.filter((term) => new RegExp(`\\b${term}\\b`, 'i').test(labeled[1])).length;
      if (hits < needed || (labeledMatch && hits <= labeledMatch.hits)) continue;
      labeledMatch = {
        hits,
        value: labeled[2].trim(),
        documentId: chunk.documentId,
        documentName: chunk.documentName,
        excerpt: line.trim().slice(0, 180),
      };
    }
  }
  if (labeledMatch) {
    return {
      value: labeledMatch.value,
      confidence: 0.84,
      rationale: 'Retrieved the labeled fact for this question.',
      citation: {
        documentId: labeledMatch.documentId,
        documentName: labeledMatch.documentName,
        excerpt: labeledMatch.excerpt,
      },
    };
  }
  if (kind === 'skip' || !top || overlap === 0 || similarity < 0.22) return blank;
  return blank;
}

function windowAround(content: string, terms: string[], max = 420): string {
  const lower = content.toLowerCase();
  const at = terms.reduce((found, term) => {
    const index = lower.indexOf(term);
    return index >= 0 && (found < 0 || index < found) ? index : found;
  }, -1);
  const start = at < 0 ? 0 : Math.max(0, at - 60);
  return content.slice(start, start + max).replace(/\s+/g, ' ').trim();
}

function nameFromHeader(text: string): string {
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(0, 40);
  const skip = /\b(guide|resume|education|internship|project|contents|overview|preparation|confidential|phone|email|linkedin|github|portfolio)\b/i;
  for (const line of lines) {
    if (line.length > 40 || skip.test(line)) continue;
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line)) return line;
  }
  return '';
}

function buildProfile(text: string) {
  const line = (label: string) => {
    const match = text.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*(.+)`, 'i'));
    return match ? match[1].trim() : '';
  };
  const fullName = line('full name') || line('name') || nameFromHeader(text);
  const parts = fullName.split(/\s+/).filter(Boolean);
  const location = line('location') || line('address');
  const locationParts = location.split(',').map((part) => part.trim()).filter(Boolean);
  return {
    fullName,
    firstName: line('first name') || parts[0] || '',
    lastName: line('last name') || (parts.length > 1 ? parts[parts.length - 1] : ''),
    email: text.match(/[\w.+-]+@[\w.-]+\.\w+/)?.[0] || line('email'),
    phone: line('phone') || line('mobile') || '',
    role: line('profession') || line('role') || line('position') || line('job title'),
    location,
    city: locationParts[0] || '',
    state: locationParts[1] || '',
    company: line('company') || line('organization'),
    website: line('website') || line('site') || text.match(/https?:\/\/\S+/)?.[0] || '',
    summary: line('summary'),
  };
}

type FieldKind =
  | 'skip'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'role'
  | 'company'
  | 'city'
  | 'state'
  | 'website'
  | 'postal'
  | 'country'
  | 'address'
  | 'gender'
  | 'dob'
  | 'summary'
  | 'blank';

function classifyField(field: FormField): FieldKind {
  const blob = `${field.name || ''} ${field.label || ''} ${field.placeholder || ''}`.toLowerCase();
  const key = blob.replace(/[^a-z]/g, '');
  const has = (...needles: string[]) => needles.some((needle) => key.includes(needle));

  if (has('password', 'passwd')) return 'skip';
  if (has('ssn', 'socialsecurity', 'ccnumber', 'cardnumber', 'cvc', 'cvv', 'ccexp', 'ccissuer', 'ccuname', 'cccst', 'drivlic', 'driverlic')) return 'skip';
  if (has('frstname', 'firstname', 'givenname') || blob.includes('first name')) return 'first_name';
  if (has('lastname', 'surname') || blob.includes('last name')) return 'last_name';
  if (has('fullname') || (blob.includes('full name'))) return 'full_name';
  if (has('email')) return 'email';
  if (has('dateofbirth', 'birthdate', 'dob') || (field.type === 'date' && blob.includes('birth'))) return 'dob';
  if (has('gender') || key === 'sex') return 'gender';
  if (has('postal', 'zipcode', 'pincode', 'postcode')) return 'postal';
  if (has('nationality', 'citizenship')) return 'country';
  if (has('country')) return 'country';
  if ((has('address', 'street') || has('addr')) && !has('email')) return 'address';
  if (has('cellphon', 'homephon', 'workphon', 'faxphon', 'phone', 'mobile')) return 'phone';
  if (has('position', 'jobtitle', 'occupation') || blob.includes('job title') || blob.includes('current title')) return 'role';
  if (has('company', 'organization', 'employer')) return 'company';
  if (has('website', 'webpage', 'homepage')) return 'website';
  if (has('city')) return 'city';
  if (has('state') || has('province')) return 'state';
  if (has('comment', 'commnt', 'message', 'coverletter', 'summary') || field.type === 'textarea') return 'summary';
  if (key === 'title') return 'blank';
  return 'blank';
}

function answerFromProfile(kind: FieldKind, profile: ReturnType<typeof buildProfile>, _field: FormField) {
  const pick = (value: string, label: string) => ({
    value,
    confidence: value ? 0.95 : 0.2,
    rationale: value ? `Taken from the knowledge base ${label}.` : `No ${label} is in the knowledge base.`,
  });
  switch (kind) {
    case 'first_name': return pick(profile.firstName, 'first name');
    case 'last_name': return pick(profile.lastName, 'last name');
    case 'full_name': return pick(profile.fullName, 'full name');
    case 'email': return pick(profile.email, 'email');
    case 'phone': return pick(profile.phone, 'phone number');
    case 'role': return pick(profile.role, 'role');
    case 'company': return pick(profile.company, 'company');
    case 'city': {
      const blob = `${_field.name || ''} ${_field.label || ''}`.toLowerCase();
      const value = blob.includes('location') ? (profile.location || profile.city) : (profile.city || profile.location);
      return pick(value, 'location');
    }
    case 'state': return pick(profile.state, 'state');
    case 'website': return pick(profile.website, 'website');
    case 'summary': return pick(profile.summary, 'summary');
    default:
      return { value: '', confidence: 0.2, rationale: 'Left blank. This field is not in the knowledge base.' };
  }
}

// Helper: Extract regex match or null
function extractGroundedValue(text: string, regex: RegExp): string | null {
  if (!text) return null;
  const match = text.match(regex);
  return match ? (match[1] || match[0]).trim() : null;
}

const DEMO_FALLBACKS = new Set([
  'Alex',
  'Morgan',
  'Alex Morgan',
  'alex.morgan@example.com',
  '+1 (555) 019-2834',
  'https://linkedin.com/in/alexmorgan-engineer',
  'https://github.com/alexmorgan',
  'San Francisco, CA',
  '6',
  '6+ years in full-stack engineering and cloud architecture',
  'Senior AI & Full-Stack Solutions Architect',
  '2026-12-01',
  'Software Engineering',
  'Alex_Morgan_Resume_2026.pdf',
]);

// Helper: Generate Persona-conditioned Subjective Essays
function generateToneEssay(
  label: string, 
  tone: PersonaTone, 
  customPromptAddons: string, 
  context: string,
  userContext: string
): string {
  const customNote = customPromptAddons ? ` User Directive: ${customPromptAddons}.` : '';

  if (tone === 'requesting') {
    return `I am writing to respectfully express my enthusiastic interest in this opportunity. With a comprehensive background in distributed web systems, AI reasoning copilots, and resilient cloud architecture, I believe my qualifications align strongly with your mission.${customNote}`;
  }
  if (tone === 'informative') {
    return `Key qualifications: 6+ years of full-stack engineering, production Next.js/PostgreSQL architecture, automated testing pipelines, and agentic LLM integrations. Proven track record leading high-performance agile initiatives.${customNote}`;
  }
  if (tone === 'casual') {
    return `Excited to submit my application! I love building fast, reliable software with modern stacks and autonomous AI agents. Looking forward to discussing how my experience can help the team build impactful products.${customNote}`;
  }

  // Default: professional
  return `With over six years of hands-on experience architecting scalable full-stack applications, intelligent context-aware copilots, and cloud microservices, I bring deep domain expertise in resilient TypeScript development, vector databases, and user-centric design.${customNote}`;
}
