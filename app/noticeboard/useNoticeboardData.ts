// app/noticeboard/useNoticeboardData.ts — the noticeboard's data-fetching layer: the
// filter/search-driven CRUD calls plus a hook that owns the notice list and reload
// cycle. Split out of page.tsx as part of the standing "decompose on touch" convention.
// Single resource, parameterized by the active filters/search — same shape as
// timesheets' period-scoped hook. Preserves the original's two-effect mount behavior
// exactly: one immediate fetch on mount, plus a separately-debounced (300ms) fetch
// whenever filters/search change (both fire on mount, since search/filters also count
// as "changed" from undefined — a pre-existing soft double-fetch-on-mount, not
// introduced here).
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Notice, NoticeFilters, NoticeFormData } from './types';

export async function getAllNotices(filters: Record<string, string | boolean | undefined> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== 'all') params.append(k, String(v));
  });
  const data = await api.get<unknown>(`/api/notices${params.toString() ? `?${params.toString()}` : ''}`);
  return Array.isArray(data) ? data as Notice[] : [];
}
export async function createNotice(data: NoticeFormData) {
  return api.post('/api/notices', data);
}
export async function updateNotice(id: string, data: NoticeFormData) {
  return api.put(`/api/notices/${id}`, data);
}
export async function deleteNotice(id: string) {
  await api.delete(`/api/notices/${id}`);
  return { success: true };
}
export async function togglePin(id: string, current: boolean) {
  return api.patch(`/api/notices/${id}`, { is_pinned: !current });
}

export function useNoticeboardData(filters: NoticeFilters, search: string) {
  const [data, setData] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const notices = await getAllNotices({ ...filters, search: search || undefined, is_pinned: filters.is_pinned ?? undefined });
      setData(Array.isArray(notices) ? notices : []);
    } catch { setData([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchNotices(); }, []);
  useEffect(() => { const timer = setTimeout(fetchNotices, 300); return () => clearTimeout(timer); }, [filters, search]);

  return { data, setData, isLoading, setIsLoading, refresh: fetchNotices };
}
