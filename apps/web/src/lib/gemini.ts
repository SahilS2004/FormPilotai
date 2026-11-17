import { runtimeEnv } from './env';

const EMBEDDING_DIM = Number(runtimeEnv('EMBEDDING_DIM') || 768);
const PRIMARY_MODEL = runtimeEnv('GEMINI_MODEL') || 'gemini-3.5-flash';
const FALLBACK_MODEL = runtimeEnv('GEMINI_FALLBACK_MODEL') || 'gemini-3.6-flash';
const EMBEDDING_MODEL = runtimeEnv('GEMINI_EMBEDDING_MODEL') || 'gemini-embedding-2';

const MODEL_CHAIN = Array.from(new Set([
  PRIMARY_MODEL,
  FALLBACK_MODEL,
  'gemini-3.8-flash',
]));

let activeModel = PRIMARY_MODEL;

export function embeddingDimension(): number {
  return EMBEDDING_DIM;
}

export function geminiConfig() {
  return {
    configured: Boolean(runtimeEnv('GEMINI_API_KEY')),
    provider: 'Google Gemini',
    model: activeModel,
    primaryModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    embeddingDimensions: EMBEDDING_DIM,
  };
}

export class GeminiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function apiKey(): string {
  const key = runtimeEnv('GEMINI_API_KEY');
  if (!key) {
    throw new GeminiError('GEMINI_API_KEY is not set. Form fill cannot call Gemini.', 500);
  }
  return key;
}

async function geminiFetch(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey(),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new GeminiError(message, response.status);
  }
  return payload;
}

function retryable(error: unknown): boolean {
  return error instanceof GeminiError && [404, 429, 500, 503].includes(error.status);
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const clean = texts.map((text) => text.replace(/\s+/g, ' ').trim().slice(0, 2000));
  const vectors: number[][] = [];
  for (let offset = 0; offset < clean.length; offset += 8) {
    const batch = clean.slice(offset, offset + 8);
    const embedded = await embedBatch(batch);
    vectors.push(...embedded);
  }
  return vectors;
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  let wait = 800;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const payload = await geminiFetch(`models/${EMBEDDING_MODEL}:batchEmbedContents`, {
        requests: texts.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text: text || 'empty' }] },
          outputDimensionality: EMBEDDING_DIM,
        })),
      }) as { embeddings?: Array<{ values?: number[] }> };
      const rows = payload.embeddings || [];
      if (rows.length !== texts.length) {
        throw new GeminiError('Embedding response did not match the batch size.', 502);
      }
      return rows.map((row) => {
        const values = row.values || [];
        if (values.length !== EMBEDDING_DIM) {
          throw new GeminiError(`Embedding model returned ${values.length} dimensions, expected ${EMBEDDING_DIM}.`, 502);
        }
        return values.map((value) => Number(value.toFixed(6)));
      });
    } catch (error) {
      if (attempt === 3 || !retryable(error)) throw error;
      await pause(wait);
      wait *= 2;
    }
  }
  throw new GeminiError('Embedding request failed.', 502);
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}

export interface GeminiFieldRequest {
  id: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: string }>;
  passages: Array<{ documentName: string; excerpt: string }>;
}

export interface GeminiFieldAnswer {
  fieldId: string;
  value: string;
  confidence: number;
  rationale: string;
  documentName: string;
  excerpt: string;
}

export async function reasonAboutForm(input: {
  title: string;
  url: string;
  fields: GeminiFieldRequest[];
}): Promise<GeminiFieldAnswer[]> {
  if (input.fields.length === 0) return [];
  const prompt = [
    'You fill one page of a web form for the user.',
    'Read the page heading first and decide what the user is applying for or submitting.',
    'Then answer each field only from the passages listed with that field.',
    '',
    'Page heading and title:',
    input.title || 'Untitled form',
    '',
    'Page URL:',
    input.url || '',
    '',
    'Rules:',
    '- Use the heading to choose among similar facts. A project link should match the program named in the heading.',
    '- Write only the short value that belongs in the box. A name, date, number, sentence, or URL. Do not paste the passage, a paragraph, or the document heading.',
    '- Never invent a name, date, phone number, employer, or URL.',
    '- When options are present, value must be exactly one option value. For a checkbox group, join every matching option value with " | ".',
    '- confidence is a number from 0 to 1. Use 0 when value is empty.',
    '- documentName and excerpt must be copied from the passage you used, or left empty when value is empty.',
    '',
    'Fields:',
    JSON.stringify(input.fields),
    '',
    'Return JSON only, with this shape:',
    '{"answers":[{"fieldId":"","value":"","confidence":0,"rationale":"","documentName":"","excerpt":""}]}',
  ].join('\n');

  const text = await generateText(prompt);
  return parseAnswers(text);
}

async function generateText(prompt: string): Promise<string> {
  const order = [activeModel, ...MODEL_CHAIN.filter((model) => model !== activeModel)];
  let lastError: unknown;
  for (const model of order) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const text = await generateWith(model, prompt);
        activeModel = model;
        return text;
      } catch (error) {
        lastError = error;
        if (!retryable(error)) throw error;
        console.warn(`[gemini] ${model} unavailable (${attempt + 1}/2)`);
        await pause(600 * (attempt + 1));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new GeminiError('Gemini did not return an answer.', 503);
}

async function generateWith(model: string, prompt: string): Promise<string> {
  const payload = await geminiFetch(`models/${model}:generateContent`, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  }) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (payload.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
  if (!text.trim()) {
    throw new GeminiError(`${model} returned an empty answer.`, 502);
  }
  return text;
}

function parseAnswers(text: string): GeminiFieldAnswer[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return [];
  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    answers?: Array<Partial<GeminiFieldAnswer>>;
  };
  return (parsed.answers || []).map((answer) => ({
    fieldId: String(answer.fieldId || ''),
    value: String(answer.value || '').trim(),
    confidence: Math.max(0, Math.min(1, Number(answer.confidence) || 0)),
    rationale: String(answer.rationale || '').trim(),
    documentName: String(answer.documentName || '').trim(),
    excerpt: String(answer.excerpt || '').trim(),
  })).filter((answer) => answer.fieldId);
}
