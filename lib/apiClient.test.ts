// lib/apiClient.test.ts — the 401 fork: an MFA-gated call (enrolled user, aal1
// token) re-runs the session gate via MFA_REQUIRED_EVENT and never shows the
// sign-in toast (the caller is signed in but challenged, not signed out); a
// plain 401 keeps the existing sign-in toast and fires no event.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  authFetch: (...args: unknown[]) => (authFetch as (...a: unknown[]) => unknown)(...args),
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => (toastError as (...a: unknown[]) => unknown)(...args) },
}));

import { api, apiFetch, ApiError } from '@/lib/apiClient';
import { MFA_REQUIRED_EVENT } from '@/lib/mfa';
import { API_BASE } from '@/lib/config';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('apiClient MFA 401 handling', () => {
  let mfaEvents = 0;
  const onMfa = () => { mfaEvents += 1; };

  beforeEach(() => {
    mfaEvents = 0;
    authFetch.mockReset();
    toastError.mockReset();
    window.addEventListener(MFA_REQUIRED_EVENT, onMfa);
  });

  it('re-runs the session gate on 401 + mfa_required header, without the sign-in toast', async () => {
    authFetch.mockResolvedValue(jsonResponse(401, { detail: 'Two-factor verification required.' }, { 'X-Auth-Reason': 'mfa_required' }));
    await expect(api.get('/api/equipment')).rejects.toThrow(ApiError);
    expect(mfaEvents).toBe(1);
    expect(toastError).not.toHaveBeenCalledWith('You need to sign in to do this', expect.anything());
  });

  it('throws a challenge message, not the raw 401, on the MFA path', async () => {
    authFetch.mockResolvedValue(jsonResponse(401, { detail: 'Two-factor verification required.' }, { 'X-Auth-Reason': 'mfa_required' }));
    const err = await api.get('/api/equipment').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).message).toBe('Two-factor verification required.');
    expect((err as ApiError).status).toBe(401);
  });

  it('falls back to the detail text when the header is stripped', async () => {
    authFetch.mockResolvedValue(jsonResponse(401, { detail: 'Two-factor verification required.' }));
    await expect(api.get('/api/equipment')).rejects.toThrow(ApiError);
    expect(mfaEvents).toBe(1);
    expect(toastError).not.toHaveBeenCalledWith('You need to sign in to do this', expect.anything());
  });

  it('keeps the sign-in toast (and fires no event) on a plain 401', async () => {
    authFetch.mockResolvedValue(jsonResponse(401, { detail: 'Sign in required.' }));
    await expect(api.get('/api/equipment')).rejects.toThrow(ApiError);
    expect(mfaEvents).toBe(0);
    expect(toastError).toHaveBeenCalledWith('You need to sign in to do this', expect.anything());
  });

  it('handles the MFA path for blob downloads too', async () => {
    authFetch.mockResolvedValue(jsonResponse(401, { detail: 'Two-factor verification required.' }, { 'X-Auth-Reason': 'mfa_required' }));
    await expect(api.blob('/api/spares/export/data')).rejects.toThrow(ApiError);
    expect(mfaEvents).toBe(1);
  });
});

describe('apiFetch auth-header provider', () => {
  const realFetch = globalThis.fetch;
  const fetchMock = vi.fn();

  beforeEach(() => {
    authFetch.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => { globalThis.fetch = realFetch; });

  it('delegates to the Supabase session when auth is omitted', async () => {
    authFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await apiFetch('/api/equipment', { method: 'GET' });
    expect(authFetch).toHaveBeenCalledTimes(1);
    expect(authFetch.mock.calls[0][0]).toBe(`${API_BASE}/api/equipment`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('attaches a string token as Bearer [REDACTED] touching the Supabase session', async () => {
    await apiFetch('/api/tools-workspace/tools', {}, 'tools-token-1');
    expect(authFetch).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${API_BASE}/api/tools-workspace/tools`);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tools-token-1');
  });

  it('resolves a provider function per call', async () => {
    await apiFetch('/api/x', {}, () => 'rotated-token');
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get('Authorization')).toBe('Bearer rotated-token');
  });

  it('sends no Authorization header when auth is explicitly null', async () => {
    await apiFetch('/api/tools-workspace/auth/login', { method: 'POST' }, null);
    expect(authFetch).not.toHaveBeenCalled();
    expect(new Headers((fetchMock.mock.calls[0] as [string, RequestInit])[1].headers).get('Authorization')).toBeNull();
  });
});
