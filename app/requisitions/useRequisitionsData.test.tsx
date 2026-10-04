import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { apiCreate, apiDelete, apiUpdate, fromBackend, useRequisitionsData } from './useRequisitionsData';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

const raw = (id: number) => ({ id, date: '2026-09-27', requester: 'Ann', section: 'Electrical', required_for: 'Pump 1', priority: 'High', status: 'Pending', requisition_number: `REQ-${id}`, notes: 'n', line_number: id, requisition_items: [{ description: 'Seal', cost_per_unit: 12.5, quantity: 2, reason: 'Worn' }] });

describe('requisitions data', () => {
  beforeEach(() => vi.resetAllMocks());

  it('maps the backend shape and survives missing fields', () => {
    expect(fromBackend(raw(7))).toMatchObject({ id: '7', requisitionNumber: 'REQ-7', required_for: 'Pump 1', lineNumber: 7, items: [{ description: 'Seal', costPerUnit: 12.5, quantity: 2, reason: 'Worn' }] });
    expect(fromBackend({ id: 1 })).toMatchObject({ section: 'Mechanical', priority: 'Medium', status: 'Draft', items: [], requisitionNumber: '' });
  });

  it('reports a failed load as an error, not an empty register, and recovers on retry', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce([raw(1)]);
    const { result } = renderHook(() => useRequisitionsData());
    await waitFor(() => expect(result.current.error).toBe('Service unavailable'));
    expect(result.current.loaded).toBe(false);
    await act(async () => result.current.refetch());
    expect(result.current.error).toBeNull();
    expect(result.current.reqs[0]?.requisitionNumber).toBe('REQ-1');
  });

  it('lets write failures propagate so the dialog can show them', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error("Requisition number 'REQ-1' already exists"));
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('nope'));
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Forbidden'));
    await expect(apiCreate({})).rejects.toThrow('already exists');
    await expect(apiUpdate('1', {})).rejects.toThrow('nope');
    await expect(apiDelete('1')).rejects.toThrow('Forbidden');
  });
});
