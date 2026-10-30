// app/ppe/budget/budgetApi.ts — reads and writes the stored budget settings plus the year's calendar.
// Everyone signed in may read; only managers save (the server enforces both).
'use client';

import { api } from '@/lib/apiClient';
import type { BudgetCalendar, BudgetSettings } from './budgetCalc';

export interface BudgetResponse {
  year: number;
  settings: BudgetSettings;
  defaults: BudgetSettings;
  calendar: BudgetCalendar;
  updated_at: string | null;
}

export async function fetchBudget(year: number): Promise<BudgetResponse> {
  const data = await api.get<unknown>(`/api/ppe/budget/${year}`);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Budget returned an invalid response.');
  const r = data as Record<string, unknown>;
  if (!r.settings || !r.calendar) throw new Error('Budget returned an invalid response.');
  return r as unknown as BudgetResponse;
}

export async function saveBudget(year: number, settings: BudgetSettings, expected_updated_at: string | null): Promise<BudgetResponse> {
  const data = await api.put<unknown>(`/api/ppe/budget/${year}`, { settings, expected_updated_at });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Budget save returned an invalid response.');
  const r = data as Record<string, unknown>;
  // The save echoes the settings row; the calendar is re-read so both stay in step.
  const current = await fetchBudget(year);
  return { ...current, settings: (r.settings as BudgetSettings) ?? current.settings, updated_at: (r.updated_at as string | null) ?? current.updated_at };
}
