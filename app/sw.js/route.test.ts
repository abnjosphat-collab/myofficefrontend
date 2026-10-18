import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

describe('sw.js route', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('serves javascript with no-cache and root Service-Worker-Allowed scope', () => {
    vi.stubEnv('APP_BUILD_ID', 'test-build');
    const res = GET();
    expect(res.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, max-age=0, must-revalidate');
    expect(res.headers.get('Service-Worker-Allowed')).toBe('/');
  });

  it('falls back through Vercel ids to dev when no build id is set', async () => {
    vi.stubEnv('APP_BUILD_ID', '');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', '');
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', '');
    expect(await GET().text()).toContain('dev');
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abc123');
    expect(await GET().text()).toContain('abc123');
  });
});
