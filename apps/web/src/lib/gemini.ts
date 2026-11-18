import { runtimeEnv } from './env';

const EMBEDDING_DIM = Number(runtimeEnv('EMBEDDING_DIM') || 768);
const PRIMARY_MODEL = runtimeEnv('GEMINI_MODEL') || 'gemini-3-flash-preview';
const FALLBACK_MODEL = runtimeEnv('GEMINI_FALLBACK_MODEL') || 'gemini-3.5-flash';
const EMBEDDING_MODEL = runtimeEnv('GEMINI_EMBEDDING_MODEL') || 'gemini-embedding-2';

const MODEL_CHAIN = Array.from(new Set([
  PRIMARY_MODEL,
  FALLBACK_MODEL,
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
]));

let activeModel = PRIMARY_MODEL;
const coolingUntil = new Map<string, number>();

/** How long to skip a model after it refuses: the daily free quota resets hours later, a busy model in seconds. */
function cooldownMs(error: GeminiError): number {
  if (error.status === 429) {
    const match = error.message.match(/retry in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?/i);
    if (match && (match[1] || match[2] || match[3])) {
      return ((Number(match[1] || 0) * 60 + Number(match[2] || 0)) * 60 + Number(match[3] || 0)) * 1000;
    }
    return /per day|daily/i.test(error.message) ? 60 * 60 * 1000 : 60 * 1000;
  }
  if (error.status === 404) return 24 * 60 * 60 * 1000;
  if (error.status === 504) return 2 * 60 * 1000;
  return 30 * 1000;
}

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

async function geminiFetch(path: string, body: unknown, timeoutMs: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': apiKey(),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new GeminiError(`Gemini did not answer within ${Math.round(timeoutMs / 1000)}s.`, 504);
    }
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } })?.error?.message || response.statusText;
    throw new GeminiError(message, response.status);
  }
  return payload;
}

function retryable(error: unknown): boolean {
  return error instanceof GeminiError && [404, 429, 500, 503, 504].includes(error.status);
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const clean = texts.map((text) => text.replace(/\s+/g, ' ').trim().slice(0, 2000));
  const vectors: number[][] = [];
  for (let offset = 0; offset < clean.length; offset += 100) {
    const batch = clean.slice(offset, offset + 100);
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
      }, 20000) as { embeddings?: Array<{ values?: number[] }> };
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

export interface FormQuestion {
  id: string;
  label: string;
  type: string;
  options?: string[];
  facts: string[];
}

export interface FormFact {
  id: string;
  source: string;
  text: string;
}

export interface GeminiFieldAnswer {
  fieldId: string;
  value: string;
  confidence: number;
  source: string;
}

const TONE_GUIDE: Record<string, string> = {
  professional: 'professional and confident',
  informative: 'clear, factual and specific',
  requesting: 'polite and earnest',
  casual: 'friendly and relaxed',
};

export const FORM_SYSTEM_PROMPT = `You are FormPilot. You fill one page of a web form for the user, using only facts the user has saved.

How to answer:
1. Read the form heading to understand what the user is applying for or submitting.
2. For each question, look at the facts listed for it first, then at every other fact.
3. Use only the facts. Never invent a name, date, number, employer, school, link, or experience.
4. If no fact answers the question, return an empty value with confidence 0. A blank is better than a guess.

How to write the value:
- Short boxes (name, email, phone, city, company, title, number, URL): only the value, for example "Aura300", never "Company: Aura300" and never a sentence copied from a document.
- Date boxes: YYYY-MM-DD. Number boxes: digits only. Phone boxes: the number as written in the facts.
- Choice questions: value must be exactly one of the listed options. For a checkbox group, join every matching option with " | ".
- Link questions: use the link whose label matches. A GitHub or portfolio box takes the profile link. A project link should be the project that best fits the form heading.
- Open questions (long text, "why", "describe", "tell us about"): write 2 to 5 sentences in the first person, in the requested tone, built only from the facts and aimed at what the form heading is about.

Which facts to trust:
- Past form answers are what the user typed before and are the most recent. Prefer them for the user's current situation: current company, current role, years of experience, notice period, expected salary, current location, relocation, and availability.
- The profile holds personal details such as name, email, phone, date of birth, and address.
- Documents hold experience, education, projects, skills, and links.
- When a past form answer and a document disagree, use the past form answer.
- Past answers can come from forms that were not about the user, such as a DNS record or an admin setting. Ignore any answer that is clearly not a fact about the user.
- A job with an end date before today is not the current job.

Return JSON only: {"answers":[{"fieldId":"","value":"","confidence":0,"source":""}]}
source is the id of the fact you used (for example "D3", "P1", "H", or "L"), or "" when value is empty.
confidence is between 0 and 1.`;

export function buildFormPrompt(input: {
  heading: string;
  tone: string;
  questions: FormQuestion[];
  facts: FormFact[];
  pastAnswers: string[];
  links: string[];
}): string {
  const facts = input.facts.map((fact) => `[${fact.id}] (${fact.source}) ${fact.text}`);
  return [
    `Today: ${new Date().toISOString().slice(0, 10)}`,
    `Form heading: ${input.heading || 'Untitled form'}`,
    `Tone for open questions: ${TONE_GUIDE[input.tone] || TONE_GUIDE.professional}`,
    '',
    'Questions:',
    JSON.stringify(input.questions),
    '',
    'Facts:',
    ...(facts.length > 0 ? facts : ['(no document passages)']),
    '',
    '[H] Past form answers:',
    ...(input.pastAnswers.length > 0 ? input.pastAnswers.map((line) => `- ${line}`) : ['(none)']),
    '',
    '[L] Links from the documents:',
    ...(input.links.length > 0 ? input.links.map((line) => `- ${line}`) : ['(none)']),
  ].join('\n');
}

export async function reasonAboutForm(input: Parameters<typeof buildFormPrompt>[0]): Promise<GeminiFieldAnswer[]> {
  if (input.questions.length === 0) return [];
  const text = await generateText(FORM_SYSTEM_PROMPT, buildFormPrompt(input));
  return parseAnswers(text);
}

/** Shared Gemini JSON text call used by form fill and the document agent. */
export async function runtimeGenerate(system: string, prompt: string): Promise<string> {
  return generateText(system, prompt);
}

async function generateText(system: string, prompt: string): Promise<string> {
  const now = Date.now();
  const order = MODEL_CHAIN.filter((model) => (coolingUntil.get(model) || 0) <= now);
  let lastError: unknown;
  for (const model of order) {
    try {
      const text = await generateWith(model, system, prompt);
      activeModel = model;
      return text;
    } catch (error) {
      lastError = error;
      if (!retryable(error)) throw error;
      const wait = cooldownMs(error as GeminiError);
      coolingUntil.set(model, Date.now() + wait);
      console.warn(`[gemini] ${model} skipped for ${Math.round(wait / 1000)}s: ${(error as Error).message.split('\n')[0]}`);
    }
  }
  throw lastError instanceof Error ? lastError : new GeminiError('Every Gemini model is out of free requests or busy.', 503);
}

async function generateWith(model: string, system: string, prompt: string): Promise<string> {
  const thinkingLevel = runtimeEnv('GEMINI_THINKING_LEVEL') || 'low';
  const request = (thinking: boolean) => geminiFetch(`models/${model}:generateContent`, {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      ...(thinking ? { thinkingConfig: { thinkingLevel } } : {}),
    },
  }, 30000);
  let payload: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  try {
    payload = await request(true) as typeof payload;
  } catch (error) {
    if (!(error instanceof GeminiError && error.status === 400 && /thinking/i.test(error.message))) throw error;
    payload = await request(false) as typeof payload;
  }
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
    source: String(answer.source || '').trim(),
  })).filter((answer) => answer.fieldId);
}

