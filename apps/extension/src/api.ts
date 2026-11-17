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

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(await apiUrl(path), init);
}
