// app/noticeboard/useNoticeboardData.ts — the noticeboard's data layer: record writes, the attachment upload, and
// the list hook. The filters and search are sent to the server, so the list path changes with them; search is
// debounced so typing a word sends one request. Writes throw so the form dialog can show the reason, and a failed
// load is reported through useApiList (the stale list stays visible on a failed refresh), never as an empty board.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import type { Attachment, Notice, NoticeFilters, NoticeFormData } from './types';

/** `/api/notices` with the active filters and search. "all" and an unset pin filter are not sent. */
export function noticesPath(filters: NoticeFilters, search: string): string {
  const params = new URLSearchParams();
  for (const key of ['category', 'priority', 'status', 'department'] as const) if (filters[key] !== 'all') params.append(key, filters[key]);
  if (filters.is_pinned !== null) params.append('is_pinned', String(filters.is_pinned));
  if (search.trim()) params.append('search', search.trim());
  const query = params.toString();
  return `/api/notices${query ? `?${query}` : ''}`;
}

/** One-shot read used outside this page (the shell's notification bell). Throws on a failure or a non-list response. */
export async function getAllNotices(filters: Record<string, string | boolean | undefined> = {}): Promise<Notice[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== 'all') params.append(k, String(v)); });
  const data = await api.get<unknown>(`/api/notices${params.toString() ? `?${params.toString()}` : ''}`);
  if (!Array.isArray(data)) throw new Error('Notices returned an unexpected response.');
  return data as Notice[];
}

export const createNotice = (data: NoticeFormData) => api.post('/api/notices', data);
// PATCH, not PUT: the backend uses CrudRouter, whose update endpoint is PATCH-only.
export const updateNotice = (id: string, data: NoticeFormData) => api.patch(`/api/notices/${id}`, data);
export const deleteNotice = (id: string) => api.delete(`/api/notices/${id}`);
export const togglePin = (id: string, current: boolean) => api.patch(`/api/notices/${id}`, { is_pinned: !current });
export const archiveNotice = (id: string) => api.patch(`/api/notices/${id}`, { status: 'Archived' });

export async function uploadNoticeAttachment(file: File): Promise<Attachment> {
  const fd = new FormData();
  fd.append('file', file);
  return api.post<Attachment>('/api/notices/upload-attachment', fd);
}

export function useNoticeboardData(filters: NoticeFilters, search: string) {
  const debouncedSearch = useDebouncedValue(search, 300);
  const list = useApiList<Notice>(noticesPath(filters, debouncedSearch));
  return { notices: list.items, setNotices: list.setItems, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
