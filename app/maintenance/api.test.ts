import { beforeEach, describe, expect, it, vi } from 'vitest';

const authFetch = vi.fn();
vi.mock('@/lib/api', () => ({ authFetch: (...a: unknown[]) => authFetch(...a) }));
vi.mock('@/lib/config', () => ({ API_BASE: 'http://api.test' }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const { updateWorkOrder, conflictOf } = await import('./api');

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('updateWorkOrder', () => {
  beforeEach(() => authFetch.mockReset());

  it('sends the version the editor loaded, so a stale save can be refused', async () => {
    authFetch.mockResolvedValue(json(200, { id: 7, version: 4 }));
    await updateWorkOrder('7', { status: 'completed' }, 3);
    expect(JSON.parse(authFetch.mock.calls[0][1].body)).toMatchObject({ status: 'completed', version: 3 });
  });

  it('sends no version when the editor has none (before the migration is applied)', async () => {
    authFetch.mockResolvedValue(json(200, { id: 7 }));
    await updateWorkOrder('7', { status: 'completed' });
    expect(JSON.parse(authFetch.mock.calls[0][1].body)).not.toHaveProperty('version');
  });

  it('turns a version conflict into the current work order, with a readable message', async () => {
    const current = { id: 7, status: 'in-progress', version: 5 };
    authFetch.mockResolvedValue(json(409, { detail: { code: 'version_conflict', message: 'This work order was changed by someone else since you opened it.', current } }));
    const error = await updateWorkOrder('7', { status: 'completed' }, 4).catch(e => e);
    expect(error.status).toBe(409);
    expect(error.message).toBe('This work order was changed by someone else since you opened it.');
    expect(conflictOf(error)).toEqual(current);
  });

  it('does not treat other failures as a conflict', async () => {
    authFetch.mockResolvedValue(json(409, { detail: 'Could not allocate a unique work order number' }));
    const error = await updateWorkOrder('7', {}, 1).catch(e => e);
    expect(conflictOf(error)).toBeNull();
    expect(conflictOf(new Error('x'))).toBeNull();
  });
});
