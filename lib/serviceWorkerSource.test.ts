// Evaluates the generated service worker in a sandbox with fake globals and asserts its policy: what it never
// touches, the only thing it caches, and that it never activates itself.
import { describe, expect, it, vi } from 'vitest';
import vm from 'node:vm';
import { buildServiceWorkerSource } from './serviceWorkerSource';

type Handler = (event: Record<string, unknown>) => void;

function load(buildId = 'build-1') {
  const handlers: Record<string, Handler> = {};
  const cachePut = vi.fn();
  const cacheDelete = vi.fn().mockResolvedValue(true);
  const skipWaiting = vi.fn();
  const claim = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn();
  const sandbox: Record<string, unknown> = {
    self: {
      addEventListener: (type: string, handler: Handler) => { handlers[type] = handler; },
      skipWaiting, clients: { claim }, location: { origin: 'https://app.test' },
    },
    caches: {
      keys: () => Promise.resolve(['myoffice-shell-v2', 'myoffice-icons-v3', 'other']),
      delete: cacheDelete,
      open: () => Promise.resolve({ put: cachePut }),
      match: () => Promise.resolve(undefined),
    },
    fetch: fetchMock,
    URL, Response, JSON, Promise,
  };
  vm.runInNewContext(buildServiceWorkerSource(buildId), sandbox);
  return { handlers, cachePut, cacheDelete, skipWaiting, claim, fetchMock };
}

const fetchEvent = (url: string, over: Record<string, unknown> = {}) => {
  const respondWith = vi.fn();
  return { event: { request: { url, method: 'GET', mode: 'cors', ...over }, respondWith }, respondWith };
};

describe('service worker source', () => {
  it('stamps the build id so every deployment is a different file', () => {
    expect(buildServiceWorkerSource('abc123')).toContain('Build: abc123');
    expect(buildServiceWorkerSource('abc123')).not.toBe(buildServiceWorkerSource('def456'));
  });

  it('sanitises the build id so it cannot inject code', () => {
    const source = buildServiceWorkerSource('x";self.evil();//');
    expect(source).not.toContain('self.evil()');
    expect(source).toContain('const BUILD_ID = "xself.evil";'); // only the safe characters remain, inside a string literal
  });

  it('does not activate itself on install and only skips waiting on an explicit message', () => {
    const { handlers, skipWaiting } = load();
    handlers.install({});
    expect(skipWaiting).not.toHaveBeenCalled();
    handlers.message({ data: { type: 'SOMETHING_ELSE' } });
    expect(skipWaiting).not.toHaveBeenCalled();
    handlers.message({ data: { type: 'SKIP_WAITING' } });
    expect(skipWaiting).toHaveBeenCalledTimes(1);
  });

  it('on activation removes caches from older versions, keeps the icon cache and claims clients', async () => {
    const { handlers, cacheDelete, claim } = load();
    let pending: Promise<unknown> = Promise.resolve();
    handlers.activate({ waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    expect(cacheDelete).toHaveBeenCalledWith('myoffice-shell-v2');
    expect(cacheDelete).toHaveBeenCalledWith('other');
    expect(cacheDelete).not.toHaveBeenCalledWith('myoffice-icons-v3');
    expect(claim).toHaveBeenCalled();
  });

  it.each([
    ['a page navigation', 'https://app.test/contractors', { mode: 'navigate' }],
    ['the home document', 'https://app.test/', { mode: 'navigate' }],
    ['an API read', 'https://app.test/api/employees', {}],
    ['an API write', 'https://app.test/api/employees', { method: 'POST' }],
    ['a Supabase call', 'https://project.supabase.co/rest/v1/user_profiles', {}],
    ['a Next.js build asset', 'https://app.test/_next/static/chunks/main.js', {}],
    ['the manifest', 'https://app.test/manifest.json', {}],
    ['a cross-origin icon', 'https://cdn.test/icons/icon-192.png', {}],
  ])('never intercepts %s', (_label, url, over) => {
    const { handlers } = load();
    const { event, respondWith } = fetchEvent(url, over);
    handlers.fetch(event);
    expect(respondWith).not.toHaveBeenCalled();
  });

  it('serves a same-origin icon network-first, caching the fresh copy', async () => {
    const { handlers, fetchMock, cachePut } = load();
    fetchMock.mockResolvedValue(new Response('png', { status: 200 }));
    const { event, respondWith } = fetchEvent('https://app.test/icons/icon-192.png');
    handlers.fetch(event);
    expect(respondWith).toHaveBeenCalledTimes(1);
    await respondWith.mock.calls[0][0];
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalled();
    expect(cachePut).toHaveBeenCalled();
  });

  it('falls back to the cache for an icon only when the network fails', async () => {
    const { handlers, fetchMock } = load();
    fetchMock.mockRejectedValue(new Error('offline'));
    const { event, respondWith } = fetchEvent('https://app.test/icons/icon-192.png');
    handlers.fetch(event);
    const response = await respondWith.mock.calls[0][0];
    expect(response.type).toBe('error');
  });
});
