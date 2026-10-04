// app/documents/useDocumentsData.ts — the hub's reads (honest load state, never a failure shown as an empty list) and writes
// (they throw, so a dialog can show the reason and keep what was typed). Reads are scoped: nothing is requested until a
// category is open, and moving to another folder starts from nothing instead of showing the previous folder's files.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { fromRow } from './documentLogic';
import type { DocumentFile, Folder } from './types';

/** The files directly inside a folder; folder = null is the category's top level. */
export function useDocuments(categoryId: string | null, folder: string | null) {
  const params = new URLSearchParams({ category_id: categoryId ?? '' });
  if (folder) params.set('folder_id', folder);
  return useApiList<Record<string, unknown>, DocumentFile>(`/api/documents?${params}`, fromRow, { enabled: categoryId !== null });
}

export function useFolders(categoryId: string | null) {
  return useApiList<Folder>(`/api/documents/folders?category_id=${encodeURIComponent(categoryId ?? '')}`, undefined, { enabled: categoryId !== null });
}

/** Search across every category. Waits for a pause in typing; the server returns at most SEARCH_LIMIT matches. */
export function useDocumentSearch(query: string, delay = 300) {
  const [typed, setTyped] = useState('');
  const trimmed = query.trim();
  useEffect(() => {
    const timer = setTimeout(() => setTyped(trimmed), delay);
    return () => clearTimeout(timer);
  }, [trimmed, delay]);
  // Cleared text stops the request at once; new text waits for a pause in typing.
  const settled = trimmed ? typed : '';
  const list = useApiList<Record<string, unknown>, DocumentFile>(`/api/documents/search?q=${encodeURIComponent(settled)}`, fromRow, { enabled: settled !== '' });
  /** True while the box holds text the results do not yet answer. */
  const pending = trimmed !== '' && trimmed !== settled;
  return { ...list, pending, query: settled };
}

export async function uploadDocument(form: FormData): Promise<DocumentFile> {
  return fromRow(await api.post<Record<string, unknown>>('/api/documents/upload', form));
}
export const updateDocument = async (id: string, patch: { name?: string; description?: string; starred?: boolean }) => { await api.put(`/api/documents/${id}`, patch); };
export const deleteDocument = async (id: string) => { await api.delete(`/api/documents/${id}`); };

export const createFolder = (categoryId: string, categoryName: string, name: string) =>
  api.post<Folder>('/api/documents/folders', { category_id: categoryId, category_name: categoryName, name });
export const renameFolder = (id: string, name: string) => api.put<Folder>(`/api/documents/folders/${id}`, { name });
export const deleteFolder = async (id: string) => { await api.delete(`/api/documents/folders/${id}`); };

/** How many files a folder holds right now (deleting a folder does not delete its files, so it must be empty first). */
export async function countFolderFiles(categoryId: string, folder: string): Promise<number> {
  const rows = await api.get<unknown>(`/api/documents?${new URLSearchParams({ category_id: categoryId, folder_id: folder })}`);
  if (!Array.isArray(rows)) throw new Error('The folder could not be checked.');
  return rows.length;
}
