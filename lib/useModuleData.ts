// lib/useModuleData.ts — generic CRUD hook for engineering module pages
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/config';
import { authFetch } from '@/lib/api';

const BASE_URL = API_BASE;

export function useModuleData<T>(endpoint: string) {
  const [data,    setData]    = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const url = `${BASE_URL}/api/${endpoint}`;

  const refetch = useCallback(async (params?: Record<string, string>) => {
    setLoading(true);
    setError('');
    try {
      const q = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
      const r = await fetch(`${url}${q}`);
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      setData(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
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
