// app/documents/useDocumentsData.ts — the document hub's data-fetching layer: the CRUD
// calls plus a hook that owns the current folder's document list and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Single
// resource, parameterized by the active category/folder — same shape as timesheets'
// period-scoped hook. The list only reloads while a category is selected (the Home view
// never renders it), matching the original's guarded loadFiles exactly.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Category, DocumentFile, Folder } from './types';

function fromDb(row: Record<string, unknown>): DocumentFile {
  return {
    id:            String(row.id),
    name:          String(row.name),
    original_name: String(row.original_name ?? row.name),
    type:          String(row.file_type  ?? 'file'),
    categoryId:    String(row.category_id ?? ''),
    categoryName:  String(row.category_name ?? ''),
    folderId:      row.folder_id ? String(row.folder_id) : null,
    folderPath:    String(row.folder_path ?? ''),
    file_size:     Number(row.file_size  ?? 0),
    starred:       Boolean(row.starred),
    description:   String(row.description ?? ''),
    created_at:    String(row.created_at),
    updated_at:    String(row.updated_at ?? row.created_at),
    file_url:      String(row.file_url   ?? ''),
    storage_path:  String(row.storage_path ?? ''),
    mime_type:     String(row.mime_type  ?? ''),
  };
}

export async function uploadDocument(fd: FormData): Promise<DocumentFile> {
  return fromDb(await api.post<Record<string, unknown>>('/api/documents/upload', fd));
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/api/documents/${id}`);
}

export async function updateDocument(id: string, updates: Partial<DocumentFile>): Promise<void> {
  await api.put(`/api/documents/${id}`, updates);
}

// ─── Folders (backend-persisted custom subfolders) ───────────────────────────

export async function fetchFolders(categoryId: string): Promise<Folder[]> {
  const data = await api.get<unknown>(`/api/documents/folders?category_id=${encodeURIComponent(categoryId)}`);
  if (!Array.isArray(data)) throw new Error('Document folders returned an unexpected response.');
  return data as Folder[];
}

export async function createFolder(categoryId: string, categoryName: string, name: string): Promise<Folder> {
  return api.post<Folder>('/api/documents/folders', { category_id: categoryId, category_name: categoryName, name });
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  return api.put<Folder>(`/api/documents/folders/${id}`, { name });
}

export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/api/documents/folders/${id}`);
}

export function useFolders(currentCategory: Category | null) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    if (!currentCategory) { setFolders([]); setError(''); return; }
    setIsLoading(true);
    setError('');
    try {
      const rows = await fetchFolders(currentCategory.id);
      if (id === requestId.current) setFolders(rows);
    } catch (e) {
      if (id === requestId.current) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message); toast.error(`Failed to load folders: ${message}`);
      }
    } finally { if (id === requestId.current) setIsLoading(false); }
  }, [currentCategory]);

  useEffect(() => { refresh(); }, [refresh]);

  return { folders, setFolders, isLoading, error, refresh };
}

// ─── Global search (across every category/folder) ────────────────────────────

export async function searchDocuments(q: string): Promise<DocumentFile[]> {
  if (!q.trim()) return [];
  const data = await api.get<unknown>(`/api/documents/search?q=${encodeURIComponent(q)}`);
  if (!Array.isArray(data)) throw new Error('Document search returned an unexpected response.');
  return data.map(row => fromDb(row as Record<string, unknown>));
}

export function useDocumentsData(currentCategory: Category | null, currentFolder: string | null) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const scope = useRef('');

  const refresh = useCallback(async (quiet = false) => {
    const id = ++requestId.current;
    if (!currentCategory) { setDocuments([]); setError(''); setIsLoading(false); return; }
    const nextScope = `${currentCategory.id}:${currentFolder ?? ''}`;
    if (scope.current !== nextScope) { scope.current = nextScope; setDocuments([]); quiet = false; }
    if (quiet) setRefreshing(true); else setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ category_id: currentCategory.id });
      if (currentFolder) params.set('folder_id', currentFolder);
      const data = await api.get<unknown>(`/api/documents?${params}`);
      if (!Array.isArray(data)) throw new Error('Documents returned an unexpected response.');
      if (id === requestId.current) setDocuments(data.map(row => fromDb(row as Record<string, unknown>)));
    } catch (e) {
      if (id === requestId.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === requestId.current) { setIsLoading(false); setRefreshing(false); }
    }
  }, [currentCategory, currentFolder]);

  useEffect(() => { refresh(); }, [refresh]);

  return { documents, setDocuments, isLoading, refreshing, error, refresh };
}
