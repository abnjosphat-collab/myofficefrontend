// app/documents/useDocumentsData.ts — the document hub's data-fetching layer: the CRUD
// calls plus a hook that owns the current folder's document list and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Single
// resource, parameterized by the active category/folder — same shape as timesheets'
// period-scoped hook. The list only reloads while a category is selected (the Home view
// never renders it), matching the original's guarded loadFiles exactly.
'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const data = await api.get<Folder[]>(`/api/documents/folders?category_id=${encodeURIComponent(categoryId)}`);
  return Array.isArray(data) ? data : [];
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

  const refresh = useCallback(async () => {
    if (!currentCategory) { setFolders([]); return; }
    setIsLoading(true);
    try { setFolders(await fetchFolders(currentCategory.id)); }
    catch (e) { toast.error(`Failed to load folders: ${e}`); }
    finally { setIsLoading(false); }
  }, [currentCategory]);

  useEffect(() => { refresh(); }, [refresh]);

  return { folders, setFolders, isLoading, refresh };
}

// ─── Global search (across every category/folder) ────────────────────────────

export async function searchDocuments(q: string): Promise<DocumentFile[]> {
  if (!q.trim()) return [];
  const data = await api.get<Record<string, unknown>[]>(`/api/documents/search?q=${encodeURIComponent(q)}`);
  return (Array.isArray(data) ? data : []).map(fromDb);
}

export function useDocumentsData(currentCategory: Category | null, currentFolder: string | null) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!currentCategory) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ category_id: currentCategory.id });
      if (currentFolder) params.set('folder_id', currentFolder);
      const data = await api.get<Record<string, unknown>[]>(`/api/documents?${params}`);
      setDocuments(data.map(fromDb));
    } catch (e) {
      toast.error(`Failed to load files: ${e}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentCategory, currentFolder]);

  useEffect(() => { refresh(); }, [refresh]);

  return { documents, setDocuments, isLoading, refresh };
}
