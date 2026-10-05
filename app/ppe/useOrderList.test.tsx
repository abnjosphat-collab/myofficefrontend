import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { api } from '@/lib/apiClient';
import { useOrderList } from './useOrderList';
import type { OrderListEntry } from './calcPPE';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const line = (id: string, over: Partial<OrderListEntry> = {}): OrderListEntry => ({ record_id: id, employee_id: 'C1', employee_name: 'Ann', ppe_type: 'safety_shoes', item_name: 'Boots', size: '8', expiry_date: '2026-11-01', ...over });
const get = vi.mocked(api.get); const post = vi.mocked(api.post); const del = vi.mocked(api.delete);

beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });
afterEach(() => localStorage.clear());

async function loaded(rows: OrderListEntry[]) {
  get.mockResolvedValue(rows);
  const hook = renderHook(() => useOrderList());
  await waitFor(() => expect(hook.result.current.loaded).toBe(true));
  return hook;
}

describe('useOrderList (shared on the server)', () => {
  it('reads the shared list and says it is still empty-handed until the server answers', async () => {
    get.mockResolvedValue([line('r1')]);
    const { result } = renderHook(() => useOrderList());
    expect(result.current.loaded).toBe(false);
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(get).toHaveBeenCalledWith('/api/ppe-order-list');
  });

  it('adds an item once, at once on screen, and sends only what is new', async () => {
    post.mockResolvedValue({ added: 1 });
    const { result } = await loaded([line('r1')]);
    act(() => result.current.addMany([line('r1'), line('r2'), line('r2')]));
    expect(result.current.entries.map(e => e.record_id)).toEqual(['r1', 'r2']);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/api/ppe-order-list');
    expect((post.mock.calls[0][1] as { entries: OrderListEntry[] }).entries.map(e => e.record_id)).toEqual(['r2']);
    act(() => result.current.addMany([line('r2')]));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('puts the list back as the server has it, and says why, when a change is refused', async () => {
    const { toast } = await import('sonner');
    const { result } = await loaded([line('r1')]);
    post.mockRejectedValueOnce(new Error('Manager role required'));
    get.mockResolvedValue([line('r1')]);
    act(() => result.current.removeMany(['r1']));
    expect(result.current.entries).toHaveLength(0);
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Manager role required'));
  });

  it('removes lines fulfilled by an issued item, and clears the list on request', async () => {
    post.mockResolvedValue({ ok: true }); del.mockResolvedValue({ ok: true });
    const { result } = await loaded([line('r1'), line('r2', { ppe_type: 'helmet', item_name: 'Helmet', size: '' }), line('r3', { employee_id: 'C2' })]);
    act(() => result.current.removeFulfilled('C1', 'safety_shoes', '8'));
    expect(result.current.entries.map(e => e.record_id)).toEqual(['r2', 'r3']);
    expect(post).toHaveBeenCalledWith('/api/ppe-order-list/remove', { record_ids: ['r1'] });
    act(() => result.current.clear());
    expect(result.current.entries).toHaveLength(0);
    expect(del).toHaveBeenCalledWith('/api/ppe-order-list');
  });

  it('moves a list this browser held before sharing up to the server once, then forgets it here', async () => {
    localStorage.setItem('oz_ppe_order_list', JSON.stringify([line('old1'), line('old2')]));
    post.mockResolvedValue({ added: 2 });
    await loaded([]);
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect((post.mock.calls[0][1] as { entries: OrderListEntry[] }).entries.map(e => e.record_id)).toEqual(['old1', 'old2']);
    await waitFor(() => expect(localStorage.getItem('oz_ppe_order_list')).toBeNull());
  });

  it('keeps the browser copy when the move fails, so nothing is lost', async () => {
    localStorage.setItem('oz_ppe_order_list', JSON.stringify([line('old1')]));
    post.mockRejectedValue(new Error('down'));
    await loaded([]);
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(localStorage.getItem('oz_ppe_order_list')).not.toBeNull();
  });
});
