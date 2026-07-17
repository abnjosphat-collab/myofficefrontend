// lib/apiClient.ts — one typed API client on top of authFetch (which attaches the
// Supabase auth token). Replaces the ~9 near-identical per-page `safetyFetch` /
// `apiFetch` / `fetchAPI` wrappers, each of which parsed errors slightly differently.
//
// - Paths starting with "/" are resolved against API_BASE; full URLs pass through.
// - Non-2xx responses throw an ApiError with a human-readable message extracted from
//   the backend's JSON `detail` (string, or FastAPI's validation-array form).
// - 204 / empty bodies resolve to undefined.
import { authFetch } from '@/lib/api';
import { API_BASE } from '@/lib/config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function resolve(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const d = body?.detail ?? body?.message;
    if (Array.isArray(d)) {
      // FastAPI validation error: [{ loc, msg }, ...]
      return d.map((x: { msg?: string; loc?: unknown[] }) => x.msg || JSON.stringify(x)).join('; ');
    }
    if (typeof d === 'string') return d;
    if (d) return JSON.stringify(d);
  } catch {
    /* fall through to text */
  }
  try {
    const text = await res.clone().text();
    if (text) return text;
  } catch { /* ignore */ }
  return `Request failed (HTTP ${res.status})`;
}

function buildInit(method: string, body?: unknown): RequestInit {
  const init: RequestInit = { method };
  if (body !== undefined) {
    if (body instanceof FormData) {
      // Let the browser set the multipart boundary — never force Content-Type here.
      init.body = body;
    } else {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
  }
  return init;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await authFetch(resolve(path), buildInit(method, body));
  if (!res.ok) throw new ApiError(await extractError(res), res.status);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Like request() but resolves to a Blob (file downloads: CSV/PDF export, etc.). */
async function requestBlob(method: string, path: string, body?: unknown): Promise<Blob> {
  const res = await authFetch(resolve(path), buildInit(method, body));
  if (!res.ok) throw new ApiError(await extractError(res), res.status);
  return res.blob();
}

/** The shared API client. Use `api.get('/api/employees')`, `api.post('/api/x', body)`, etc.
 *  Pass a FormData body to post/put for file uploads; use api.blob() for downloads. */
export const api = {
  get:   <T = unknown>(path: string) => request<T>('GET', path),
  post:  <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put:   <T = unknown>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T = unknown>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete:<T = unknown>(path: string) => request<T>('DELETE', path),
  /** GET (or POST with body) returning a Blob — for CSV/PDF/file downloads. */
  blob:  (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => requestBlob(method, path, body),
};
