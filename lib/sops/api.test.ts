import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { archiveSop, createSop, fetchArchivedSops, fetchSop, fetchSops, restoreSop, updateSop, type SopWritePayload } from './api';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('SOP library API calls', () => {
  beforeEach(() => vi.resetAllMocks());

  describe('fetchSops', () => {
    it('asks for the whole list when there are no filters', async () => {
      vi.mocked(api.get).mockResolvedValue([]);
      await fetchSops();
      expect(api.get).toHaveBeenCalledWith('/api/sops');
    });

    it('sends only the filters that are set, URL-encoded', async () => {
      vi.mocked(api.get).mockResolvedValue([]);
      await fetchSops({ search: 'lock out & tag', department: 'Mining', status: '', owner: undefined });
      expect(api.get).toHaveBeenCalledWith('/api/sops?search=lock+out+%26+tag&department=Mining');
    });

    it('sends every filter when all are set', async () => {
      vi.mocked(api.get).mockResolvedValue([]);
      await fetchSops({ search: 's', department: 'd', status: 'active', owner: 'o' });
      expect(api.get).toHaveBeenCalledWith('/api/sops?search=s&department=d&status=active&owner=o');
    });

    it('returns what the API returned', async () => {
      const rows = [{ id: 'a' }];
      vi.mocked(api.get).mockResolvedValue(rows);
      await expect(fetchSops()).resolves.toBe(rows);
    });

    it('lets a failure reach the caller instead of returning an empty list', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('503'));
      await expect(fetchSops()).rejects.toThrow('503');
    });
  });

  it('fetchArchivedSops reads the archive route', async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    await fetchArchivedSops();
    expect(api.get).toHaveBeenCalledWith('/api/sops/archived');
  });

  it('fetchSop reads one SOP with its revisions', async () => {
    const detail = { sop: { id: 'x' }, revisions: [] };
    vi.mocked(api.get).mockResolvedValue(detail);
    await expect(fetchSop('x')).resolves.toBe(detail);
    expect(api.get).toHaveBeenCalledWith('/api/sops/x');
  });

  it('createSop posts the full payload', async () => {
    const payload = { code: 'SOP-1', title: 'T' } as unknown as SopWritePayload;
    vi.mocked(api.post).mockResolvedValue({ id: 'new' });
    await expect(createSop(payload)).resolves.toEqual({ id: 'new' });
    expect(api.post).toHaveBeenCalledWith('/api/sops', payload);
  });

  it('updateSop patches by id with a partial payload', async () => {
    vi.mocked(api.patch).mockResolvedValue({ id: 'x' });
    await updateSop('x', { title: 'New' } as Partial<SopWritePayload>);
    expect(api.patch).toHaveBeenCalledWith('/api/sops/x', { title: 'New' });
  });

  it('archiveSop and restoreSop post to their own routes without a body', async () => {
    vi.mocked(api.post).mockResolvedValue({ id: 'x' });
    await archiveSop('x');
    await restoreSop('x');
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/sops/x/archive');
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/sops/x/restore');
  });

  it('write failures propagate', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('403'));
    await expect(archiveSop('x')).rejects.toThrow('403');
  });
});
