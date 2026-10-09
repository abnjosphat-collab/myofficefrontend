import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const post = vi.fn();
const refetch = vi.fn(async () => {});
vi.mock('@/lib/apiClient', () => ({ api: { post: (...a: unknown[]) => post(...a), put: vi.fn(), delete: vi.fn() } }));
vi.mock('@/lib/useApiList', () => ({ useApiList: () => ({ items: [], loaded: true, loading: false, error: null, errorStatus: null, refetch, setItems: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { INVENTORY_STORAGE_KEY, useInventoryData } from './useInventoryData';

const local = [
  { id: 'inv-1', name: 'Gloves', sku: 'G1', category: 'PPE', description: '', currentStock: 4, minStock: 2, maxStock: 10, unit: 'pair', cost: 2, supplier: 'Acme', location: 'A', status: 'in-stock', lastRestocked: '2026-01-05T00:00:00Z' },
  { id: 'inv-2', name: 'Boots', sku: 'B1', category: 'PPE', description: '', currentStock: 1, minStock: 2, maxStock: 5, unit: 'pair', cost: 30, supplier: 'Acme', location: 'A', status: 'low-stock', lastRestocked: '' },
];

describe('useInventoryData: moving a browser\'s old items to the shared register', () => {
  beforeEach(() => { post.mockReset(); refetch.mockClear(); window.localStorage.clear(); });

  it('sends each local item to the server, then forgets them and reloads', async () => {
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(local));
    post.mockResolvedValue({});
    renderHook(() => useInventoryData());
    await waitFor(() => expect(refetch).toHaveBeenCalled());
    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0][1]).toMatchObject({ name: 'Gloves', currentStock: 4, lastRestocked: '2026-01-05T00:00:00Z' });
    expect(post.mock.calls[0][1]).not.toHaveProperty('id');
    expect(window.localStorage.getItem(INVENTORY_STORAGE_KEY)).toBeNull();
  });

  it('keeps whatever the server did not save, for the next visit', async () => {
    window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(local));
    post.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline'));
    renderHook(() => useInventoryData());
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(INVENTORY_STORAGE_KEY) ?? '[]')).toHaveLength(1));
    expect(JSON.parse(window.localStorage.getItem(INVENTORY_STORAGE_KEY)!)[0].id).toBe('inv-2');
  });

  it('does nothing when the browser holds no items', async () => {
    renderHook(() => useInventoryData());
    await new Promise(r => setTimeout(r, 20));
    expect(post).not.toHaveBeenCalled();
  });
});
