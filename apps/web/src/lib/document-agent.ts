import { DocumentJob } from '@formpilot/shared';
import { fetchAllDocuments, withDatabase } from './db';
import { getDocumentJob, updateDocumentJob } from './document-jobs';
import { textToPdf } from './document-pdf';
import { GeminiError, runtimeGenerate } from './gemini';
import { ONBOARDING_DOC_ID } from './onboarding-profile';
import { searchCompany, tavilyConfigured } from './tavily';

const DOC_SYSTEM = `You write one upload-ready document for a job or internship application.

Rules:
- Use only the applicant facts and the company research provided.
- Never invent employers, degrees, dates, awards, or metrics.
- Write in the first person in the requested tone.
- Cover letters, proposals, and statements: 3 to 5 short paragraphs, plain text, no markdown headings.
- A proposal explains the work the applicant would do. A cover letter introduces the applicant for the role.
- Mention the company and role when they are known.
- Use company research only for public facts (what they do, products, mission). Do not invent private details.
- End with a polite closing and the applicant's name if it is in the facts.
- Return JSON only: {"title":"","body":""}`;

async function loadApplicantFacts(): Promise<string[]> {
  const facts: string[] = [];
  const pool = await withDatabase();
  if (pool) {
    const profile = await pool.query(
      `SELECT content_text FROM documents WHERE id = $1 LIMIT 1`,
      [ONBOARDING_DOC_ID]
    );
    const text = String(profile.rows[0]?.content_text || '').trim();
    if (text) {
      for (const line of text.split('\n').map((part) => part.trim()).filter(Boolean).slice(0, 40)) {
        facts.push(line.slice(0, 240));
      }
    }
  }

  const docs = (await fetchAllDocuments()).filter(
    (doc) => doc.isEnabled !== false && doc.id !== ONBOARDING_DOC_ID && doc.sourceType !== 'history' && doc.sourceType !== 'snippet'
  );
  for (const doc of docs.slice(0, 4)) {
    if (!pool) continue;
    const row = await pool.query(
      `SELECT content_text FROM documents WHERE id = $1 LIMIT 1`,
      [doc.id]
    );
    const text = String(row.rows[0]?.content_text || '').replace(/\s+/g, ' ').trim();
    if (text) facts.push(`${doc.name}: ${text.slice(0, 500)}`);
  }
  return facts;
}

function filenameFor(job: DocumentJob): string {
  const base = (job.title || job.docType || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'document';
  return `${base}.pdf`;
}

async function draftWithGemini(job: DocumentJob, research: string[], facts: string[]): Promise<{ title: string; body: string }> {
  const kind = job.docType === 'proposal'
    ? 'proposal'
    : job.docType === 'statement'
      ? 'personal statement'
      : job.docType === 'other'
        ? (job.title || 'application document')
        : 'cover letter';
  const prompt = [
    `Document type: ${kind}`,
    `Requested title: ${job.title}`,
    `Company: ${job.company || '(unknown)'}`,
    `Role: ${job.role || '(unknown)'}`,
    `Form heading: ${job.formHeading || '(none)'}`,
    `Tone: ${job.tone}`,
    '',
    'Applicant facts:',
    ...(facts.length > 0 ? facts.map((line) => `- ${line}`) : ['(none)']),
    '',
    'Company research from the web:',
    ...(research.length > 0 ? research.map((line) => `- ${line}`) : ['(none — write from the role and heading only)']),
  ].join('\n');

  const text = await runtimeGenerate(DOC_SYSTEM, prompt);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new GeminiError('Document agent returned no JSON.', 502);
  const parsed = JSON.parse(text.slice(start, end + 1)) as { title?: string; body?: string };
  const body = String(parsed.body || '').trim();
  if (!body) throw new GeminiError('Document agent returned an empty body.', 502);
  return {
    title: String(parsed.title || job.title || 'Cover Letter').trim().slice(0, 180),
    body,
  };
}

/** Background worker for one document job. Safe to fire-and-forget. */
export async function runDocumentJob(jobId: string): Promise<void> {
  const job = await getDocumentJob(jobId);
  if (!job || job.status === 'ready' || job.status === 'accepted' || job.status === 'rejected') return;

  await updateDocumentJob(jobId, { status: 'generating', error: undefined });

  try {
    const query = [job.company, job.role, job.formHeading, 'company overview']
      .filter(Boolean)
      .join(' ')
      .slice(0, 300);
    let research: string[] = [];
    if (tavilyConfigured() && query.trim()) {
      try {
        const results = await searchCompany(query, 5);
        research = results.map((row) => {
          const head = row.title ? `${row.title}: ` : '';
          const link = row.url ? ` (${row.url})` : '';
          return `${head}${row.content}${link}`;
        });
      } catch (error) {
        console.warn('[document-agent] Tavily unavailable', error);
      }
    }

    const facts = await loadApplicantFacts();
    const draft = await draftWithGemini(job, research, facts);
    const pdf = await textToPdf(draft.title, draft.body);
    const filename = filenameFor({ ...job, title: draft.title });

    await updateDocumentJob(jobId, {
      status: 'ready',
      draftText: draft.body,
      draftFilename: filename,
      draftMime: 'application/pdf',
      draftBase64: pdf.toString('base64'),
      error: undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document generation failed.';
    console.error('[document-agent]', jobId, message);
    await updateDocumentJob(jobId, { status: 'failed', error: message });
  }
}
