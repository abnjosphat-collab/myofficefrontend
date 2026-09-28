// app/pachedu/usePacheduData.ts — the Pachedu page's data-fetching layer: report CRUD,
// the stats-overview endpoint, and a hook owning both under one load cycle. Split out
// of page.tsx as part of the standing "decompose on touch" convention.
'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { PacheduReport, PacheduStats } from './types';

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage look like "no reports yet". loadData already sets an error state; it
// just never got the chance to.
export async function getPacheduReports(): Promise<PacheduReport[]> {
  const reports:PacheduReport[]=[];
  const pageSize=1000;
  for(let offset=0;;offset+=pageSize){
    const data=await api.get<PacheduReport[]>(`/api/pachedu/?limit=${pageSize}&offset=${offset}`);
    if(!Array.isArray(data))throw new Error('Pachedu reports returned an unexpected response.');
    reports.push(...data);
    if(data.length<pageSize)return reports;
  }
}
export async function createPacheduReport(report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await api.post<PacheduReport>('/api/pachedu/', report); } catch { return null; }
}
export async function updatePacheduReport(id: string, report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await api.patch<PacheduReport>(`/api/pachedu/${id}`, report); } catch { return null; }
}
export async function deletePacheduReport(id: string): Promise<boolean> {
  try { await api.delete(`/api/pachedu/${id}`); return true; } catch { return false; }
}
export async function getPacheduStats(): Promise<PacheduStats> {
  const data = await api.get<PacheduStats>('/api/pachedu/stats/overview');
  if(!data||typeof data!=='object'||typeof data.total!=='number'||!data.bySection||!data.byDept||!data.byBehaviour)throw new Error('Pachedu statistics returned an unexpected response.');
  return data;
}

export function usePacheduData() {
  const [reports, setReports] = useState<PacheduReport[]>([]);
  const [stats, setStats] = useState<PacheduStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statsError, setStatsError] = useState('');
  const requestRef=useRef(0);

  const loadData = async (quiet=false) => {
    const requestId=++requestRef.current;
    if(quiet)setRefreshing(true);else setLoading(true);
    setError('');setStatsError('');
    const [reportsResult,statsResult]=await Promise.allSettled([getPacheduReports(),getPacheduStats()]);
    if(requestId!==requestRef.current)return;
    if(reportsResult.status==='fulfilled')setReports(reportsResult.value);
    else setError(reportsResult.reason instanceof Error?reportsResult.reason.message:'Failed to load Pachedu reports.');
    if(statsResult.status==='fulfilled')setStats(statsResult.value);
    else setStatsError(statsResult.reason instanceof Error?statsResult.reason.message:'Failed to load Pachedu statistics.');
    setLoading(false);setRefreshing(false);
  };

  return { reports, setReports, stats, setStats, loading, setLoading, refreshing, error, statsError, refresh: loadData };
}
