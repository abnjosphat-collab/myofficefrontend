import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import type { Category } from './types';
import { useDocumentsData, useFolders } from './useDocumentsData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));

const category: Category = {
  id: '1', name: 'Planning', icon: () => null, color: '#888', description: '',
};

describe('document folder loading', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports a failed folder request instead of an empty result', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Service unavailable'));

    const { result } = renderHook(() => useDocumentsData(category, 'folder-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.documents).toEqual([]);
    expect(result.current.error).toBe('Service unavailable');
  });

  it('ignores an older folder response after navigation', async () => {
    let resolveOld: (value: unknown) => void = () => {};
    vi.mocked(api.get)
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce([{ id: 'new', name: 'Current folder' }]);

    const { result, rerender } = renderHook(
      ({ folder }) => useDocumentsData(category, folder),
      { initialProps: { folder: 'old-folder' } },
    );
    rerender({ folder: 'new-folder' });
    await waitFor(() => expect(result.current.documents[0]?.id).toBe('new'));

    resolveOld([{ id: 'old', name: 'Previous folder' }]);
    await waitFor(() => expect(result.current.documents[0]?.id).toBe('new'));
  });

  it('preserves loaded documents when a quiet refresh fails', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce([{ id: 'one', name: 'Loaded document' }])
      .mockRejectedValueOnce(new Error('Service unavailable'));
    const { result } = renderHook(() => useDocumentsData(category, 'folder-1'));
    await waitFor(() => expect(result.current.documents[0]?.id).toBe('one'));
    await act(async () => { await result.current.refresh(true); });
    expect(result.current.documents[0]?.id).toBe('one');
    expect(result.current.error).toBe('Service unavailable');
  });

  it('reports malformed document payloads as unavailable', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ rows: [] });
    const { result } = renderHook(() => useDocumentsData(category, 'folder-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('unexpected response');
  });

  it('reports malformed custom-folder payloads', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ rows: [] });
    const { result } = renderHook(() => useFolders(category));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toContain('unexpected response');
  });
});
