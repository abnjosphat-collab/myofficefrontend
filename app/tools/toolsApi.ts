import { API_BASE } from '@/lib/config';

export class ToolsApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}/api/tools-workspace${path}`, { ...init, headers });
  if (!response.ok) {
    let message = 'The change could not be saved.';
    try { const body = await response.json(); message = body.detail || message; } catch { /* non-JSON response */ }
    throw new ToolsApiError(message, response.status);
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const toolsApi = {
  get: <T>(path: string, token: string) => request<T>(path, token),
  post: <T>(path: string, token: string, body?: unknown) => request<T>(path, token, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, token: string, body: unknown) => request<T>(path, token, { method: 'PATCH', body: JSON.stringify(body) }),
  anonymousPost: <T>(path: string, body: unknown) => request<T>(path, undefined, { method: 'POST', body: JSON.stringify(body) }),
};
