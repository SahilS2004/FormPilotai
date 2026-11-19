export const AWS_API_BASE = 'https://formpilot.innovchromatic.tech';

const STORAGE_KEY = 'formpilot_api_base';

export async function getApiBase(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = typeof stored[STORAGE_KEY] === 'string' ? stored[STORAGE_KEY].trim() : '';
    if (value.startsWith('http')) return value.replace(/\/$/, '');
  } catch {
    // Storage can be unavailable while the worker is starting.
  }
  return AWS_API_BASE;
}

export async function apiUrl(path: string): Promise<string> {
  const base = await getApiBase();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function isContentScript(): boolean {
  try {
    return location.protocol === 'http:' || location.protocol === 'https:';
  } catch {
    return false;
  }
}

function headersToRecord(headers?: HeadersInit): Record<string, string> {
  const record: Record<string, string> = {};
  if (!headers) return record;
  new Headers(headers).forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  // Content scripts share the form page's origin, so a direct call to the API
  // is blocked (the page shows "Failed to fetch"). The service worker is allowed.
  if (isContentScript()) {
    let payload: {
      error?: boolean;
      message?: string;
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
      body?: string;
    };
    try {
      payload = await chrome.runtime.sendMessage({
        type: 'API_FETCH',
        path,
        method: init?.method || 'GET',
        headers: headersToRecord(init?.headers),
        body: typeof init?.body === 'string' ? init.body : undefined,
      });
    } catch (error) {
      throw new TypeError(error instanceof Error ? error.message : 'Failed to fetch');
    }
    if (!payload || payload.error) {
      throw new TypeError(payload?.message || 'Failed to fetch');
    }
    return new Response(payload.body ?? '', {
      status: payload.status ?? 500,
      statusText: payload.statusText || '',
      headers: payload.headers,
    });
  }
  return fetch(await apiUrl(path), init);
}
