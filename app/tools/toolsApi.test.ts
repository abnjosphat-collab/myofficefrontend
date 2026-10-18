// app/tools/toolsApi.test.ts — the Tools client rides the shared apiFetch transport
// (URL building + auth header) but keeps its own response contract: ToolsApiError
// with Tools wording, no main-app sign-in toast or MFA re-run on a 401 (a Tools
// 401 means a bad Tools password), wake-up retries for sign-in, silent anonymous
// posts with no Authorization header.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => (toastError as (...a: unknown[]) => unknown)(...args) },
}));

import { API_BASE } from '@/lib/config';
import { ApiError } from '@/lib/apiClient';
import { toolsApi, toolsLoginErrorMessage, retryUndelivered, ToolsApiError } from './toolsApi';

const realFetch = globalThis.fetch;
const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit];
  return { url, init };
}

describe('toolsApi transport', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toastError.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });
  afterEach(() => { globalThis.fetch = realFetch; });

  it('sends the Tools session token, not the Supabase one', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: 1 }]));
    const rows = await toolsApi.get<{ id: number }[]>('/tools', 'tools-token-1');
    expect(rows).toEqual([{ id: 1 }]);
    const { url, init } = lastCall();
    expect(url).toBe(`${API_BASE}/api/tools-workspace/tools`);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tools-token-1');
  });

  it('a Tools 401 stays a ToolsApiError and never raises the main-app sign-in toast', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { detail: 'Bad credentials' }));
    const err = await toolsApi.get('/tools', 'stale-token').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ToolsApiError);
    expect(err).not.toBeInstanceOf(ApiError);
    expect((err as ToolsApiError).message).toBe('Bad credentials');
    expect((err as ToolsApiError).status).toBe(401);
    expect(toastError).not.toHaveBeenCalled();
    expect(toolsLoginErrorMessage(err)).toBe('The username or password does not match.');
  });

  it('falls back to the Tools wording on a non-JSON failure', async () => {
    fetchMock.mockResolvedValue(new Response('<html>proxy error</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }));
    const err = await toolsApi.post('/tools', 't', {}).catch((e: unknown) => e);
    expect((err as ToolsApiError).message).toBe('The change could not be saved.');
  });

  it('resolves undefined on 204', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(toolsApi.get('/tools', 't')).resolves.toBeUndefined();
  });

  it('anonymous posts carry no Authorization header', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    await toolsApi.anonymousPost('/auth/login', { u: 'a', p: 'b' });
    expect(new Headers(lastCall().init.headers).get('Authorization')).toBeNull();
  });

  it('retries an undelivered call, then reports it', async () => {
    let attempts = 0;
    const flaky = async () => { attempts += 1; if (attempts < 3) throw new TypeError('down'); return 'up'; };
    await expect(retryUndelivered(flaky, [5, 5, 5])).resolves.toBe('up');
    expect(attempts).toBe(3);
    const dead = async () => { attempts += 1; throw new ToolsApiError('unavailable', 503); };
    await expect(retryUndelivered(dead, [5])).rejects.toThrow(ToolsApiError);
    // A refusal is reported at once, never retried.
    const refused = vi.fn(async () => { throw new ToolsApiError('no', 401); });
    await expect(retryUndelivered(refused, [5, 5])).rejects.toThrow(ToolsApiError);
    expect(refused).toHaveBeenCalledTimes(1);
  });

  it('downloads resolve blobs and keep the download fallback', async () => {
    const blob = new Blob(['x']);
    fetchMock.mockResolvedValue(new Response(blob, { status: 200 }));
    await expect(toolsApi.download('/docs/1', 't')).resolves.toBeInstanceOf(Blob);
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    const err = await toolsApi.download('/docs/1', 't').catch((e: unknown) => e);
    expect((err as ToolsApiError).message).toBe('The document could not be downloaded.');
  });
});
