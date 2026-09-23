import { API_BASE } from '@/lib/config';

export class ToolsApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export function toolsErrorMessage(detail: unknown, fallback = 'The change could not be saved.'): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail.flatMap(item => {
      if (!item || typeof item !== 'object') return [];
      const row = item as { msg?: unknown; loc?: unknown };
      if (typeof row.msg !== 'string') return [];
      const location = Array.isArray(row.loc)
        ? row.loc.filter(part => part !== 'body').map(String).join(' ')
        : '';
      return [`${location ? `${location}: ` : ''}${row.msg}`];
    });
    if (messages.length) return messages.join(' ');
  }
  if (detail && typeof detail === 'object') {
    const row = detail as { message?: unknown; msg?: unknown };
    if (typeof row.message === 'string' && row.message.trim()) return row.message;
    if (typeof row.msg === 'string' && row.msg.trim()) return row.msg;
  }
  return fallback;
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}/api/tools-workspace${path}`, { ...init, headers });
  if (!response.ok) {
    let message = 'The change could not be saved.';
    try { const body = await response.json(); message = toolsErrorMessage(body.detail, message); } catch { /* non-JSON response */ }
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
