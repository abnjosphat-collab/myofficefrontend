// lib/useModuleData.ts — generic CRUD hook for engineering module pages
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';
import { ApiError } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';

const BASE_URL = API_BASE;

export function useModuleData<T>(endpoint: string) {
  const [data,    setData]    = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const url = `${BASE_URL}/api/${endpoint}`;

  const latest = useRef(0);
  // A read that fails because the service is slow, waking up or unreachable is retried (the page keeps loading); a refusal or a
  // bad request is reported at once. The message keeps the "<HTTP status>: <body>" form the pages parse.
  const refetch = useCallback(async (params?: Record<string, string>) => {
    const request = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
      // authFetch (not raw fetch) so the read carries the Supabase token — keeps GET
      // consistent with this hook's create/update/remove and lets read endpoints be guarded.
      const rows = await retryTransient(async () => {
        const r = await authFetch(`${url}${q}`);
        if (!r.ok) throw new ApiError(`${r.status}: ${await r.text()}`, r.status);
        return r.json();
      }, { cancelled: () => request !== latest.current });
      if (request === latest.current) setData(rows);
    } catch (e) {
      if (request === latest.current) setError((e as Error).message);
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => { refetch(); }, [refetch]);

  const create = async (body: Partial<T>): Promise<T | null> => {
    const r = await authFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    const created: T = await r.json();
    setData(prev => [created, ...prev]);
    return created;
  };

  const update = async (id: number | string, body: Partial<T>): Promise<T | null> => {
    const r = await authFetch(`${url}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    const updated: T = await r.json();
    setData(prev => prev.map((item: any) => item.id === id ? updated : item));
    return updated;
  };

  const remove = async (id: number | string): Promise<void> => {
    const r = await authFetch(`${url}/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    setData(prev => prev.filter((item: any) => item.id !== id));
  };

  return { data, loading, error, refetch, create, update, remove };
}
