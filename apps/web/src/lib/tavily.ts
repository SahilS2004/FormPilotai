import { runtimeEnv } from './env';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

export function tavilyConfigured(): boolean {
  return Boolean(runtimeEnv('TAVILY_API_KEY'));
}

/** Short company / role research for the document agent. */
export async function searchCompany(query: string, maxResults = 5): Promise<TavilyResult[]> {
  const key = runtimeEnv('TAVILY_API_KEY');
  if (!key) {
    throw new Error('TAVILY_API_KEY is not set.');
  }
  const cleaned = query.replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!cleaned) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query: cleaned,
      search_depth: 'basic',
      include_answer: true,
      max_results: maxResults,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const payload = await response.json().catch(() => ({})) as {
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
    detail?: { error?: string };
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.detail?.error || payload.error || `Tavily search failed (${response.status})`);
  }

  const rows = (payload.results || [])
    .map((row) => ({
      title: String(row.title || '').trim(),
      url: String(row.url || '').trim(),
      content: String(row.content || '').replace(/\s+/g, ' ').trim().slice(0, 600),
    }))
    .filter((row) => row.content);

  if (payload.answer?.trim()) {
    rows.unshift({
      title: 'Summary',
      url: '',
      content: payload.answer.replace(/\s+/g, ' ').trim().slice(0, 800),
    });
  }
  return rows.slice(0, maxResults + 1);
}
