// app/documents/useDocumentsData.ts — the library's reads (honest load state: a failure is an error with a retry, never an empty
// library) and writes (they throw, so a dialog can show the reason and keep what was typed).
'use client';

import { useMemo } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { useApiResource } from '@/lib/useApiResource';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { folderFromRow, fromRow, searchPath } from './documentLogic';
import type { ActivityEntry, BulkAction, BulkResult, DocFilters, DocFolder, DocumentFile, Overview, Place, SearchResult } from './types';

/** The error the server gives until the one-time upgrade SQL has been run (see supabase_migration_documents_v2.sql). */
export const needsUpgrade = (status: number | null, message: string | null): boolean => status === 409 && /one-time upgrade/i.test(message ?? '');

/** Folders, the counts behind them and the filter options. One request, refreshed after anything changes. */
export function useOverview() {
  const state = useApiResource<Record<string, unknown>>('/api/documents/overview');
  const overview = useMemo<Overview | null>(() => {
    const d = state.data as { folders?: Record<string, unknown>[]; counts?: Overview['counts']; facets?: Overview['facets']; seeded?: boolean; ams_missing?: number } | null;
    if (!d || !Array.isArray(d.folders)) return null;
    return {
      folders: d.folders.map(folderFromRow), seeded: Boolean(d.seeded), amsMissing: Number(d.ams_missing ?? 0),
      counts: d.counts ?? { all: 0, unfiled: 0, trashed: 0, starred: 0, unindexed: 0 },
      facets: d.facets ?? { types: {}, exts: [], tags: [], uploaders: [] },
    };
  }, [state.data]);
  return { ...state, overview, upgradeNeeded: needsUpgrade(state.errorStatus, state.error) };
}

/** The files for a place and a set of filters. Typing waits for a pause; the files already on screen stay until the new answer arrives. */
export function useDocumentSearch(place: Place, filters: DocFilters) {
  const settled = useDebouncedValue(filters.q, 300);
  const path = searchPath(place, { ...filters, q: settled });
  const state = useApiResource<Record<string, unknown>>(path);
  const result = useMemo<SearchResult | null>(() => {
    const d = state.data as { items?: Record<string, unknown>[]; total?: number; truncated?: boolean; terms?: string[] } | null;
    if (!d || !Array.isArray(d.items)) return null;
    return { items: d.items.map(fromRow), total: Number(d.total ?? d.items.length), truncated: Boolean(d.truncated), terms: d.terms ?? [] };
  }, [state.data]);
  /** True while the box holds words the list on screen does not yet answer. */
  const pending = filters.q.trim() !== settled.trim();
  return { ...state, result, pending, upgradeNeeded: needsUpgrade(state.errorStatus, state.error) };
}

export function useActivity(documentId: string | null) {
  return useApiList<ActivityEntry>(`/api/documents/${documentId ?? 'none'}/activity`, undefined, { enabled: documentId !== null });
}

// ── Files ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function uploadDocument(form: FormData): Promise<DocumentFile & { alsoIn: { id: string; name: string; folder_path: string }[] }> {
  const raw = await api.post<Record<string, unknown>>('/api/documents/upload', form);
  return { ...fromRow(raw), alsoIn: Array.isArray(raw.also_in) ? (raw.also_in as { id: string; name: string; folder_path: string }[]) : [] };
}

export interface DocumentPatch { name?: string; description?: string; starred?: boolean; tags?: string[]; folder_id?: string | null; expected_updated_at?: string }
export const updateDocument = async (id: string, patch: DocumentPatch) => { await api.put(`/api/documents/${id}`, patch); };

export async function bulkAction(ids: string[], action: BulkAction, extra: { folder_id?: string | null; tags?: string[] } = {}): Promise<BulkResult> {
  return api.post<BulkResult>('/api/documents/bulk', { ids, action, ...extra });
}

/** Documents are removed in batches the server accepts (it refuses more than 200 at a time). */
export async function bulkInBatches(ids: string[], action: BulkAction, extra: { folder_id?: string | null; tags?: string[] } = {}): Promise<BulkResult> {
  const total: BulkResult = { done: [], failed: [] };
  for (let i = 0; i < ids.length; i += 200) {
    const part = await bulkAction(ids.slice(i, i + 200), action, extra);
    total.done.push(...part.done);
    total.failed.push(...part.failed);
  }
  return total;
}

export const deleteDocumentForGood = async (id: string) => { await api.delete(`/api/documents/${id}?permanent=true`); };
/** Keep a PDF with a Word or Excel paper so Print sends its exact pages; replaces the one it had. */
export async function setPrintCopy(id: string, pdf: File): Promise<DocumentFile> {
  const form = new FormData();
  form.append('file', pdf);
  return fromRow(await api.post<Record<string, unknown>>(`/api/documents/${id}/print-copy`, form));
}
export const removePrintCopy = async (id: string): Promise<DocumentFile> => fromRow(await api.delete<Record<string, unknown>>(`/api/documents/${id}/print-copy`));

/** Read the words of files uploaded before text search existed, a few at a time, until none are left. Reports progress. */
export async function reindexAll(onProgress: (remaining: number) => void): Promise<void> {
  for (let guard = 0; guard < 500; guard += 1) {
    const r = await api.post<{ processed: number; remaining: number }>('/api/documents/reindex?limit=5');
    onProgress(r.remaining);
    if (r.remaining <= 0 || r.processed === 0) return;
  }
}

// ── Folders ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const createFolder = (parentId: string | null, name: string, description = ''): Promise<DocFolder> =>
  api.post<Record<string, unknown>>('/api/documents/folders', { parent_id: parentId, name, description }).then(folderFromRow);
export const updateFolder = async (id: string, patch: { name?: string; parent_id?: string | null; description?: string }) => { await api.put(`/api/documents/folders/${id}`, patch); };
export const deleteFolder = async (id: string) => { await api.delete(`/api/documents/folders/${id}`); };
export const seedAmsFolders = () => api.post<{ created: number; adopted: number; skipped: number; total: number }>('/api/documents/folders/seed-ams');
