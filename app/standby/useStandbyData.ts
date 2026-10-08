// app/standby/useStandbyData.ts — the standby page's data layer: rotations, the duty
// roster, and the writes. Every read reports its own failure; a source that could
// not be loaded is named, never treated as "nobody on standby".
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { DutyEntry, StandbyRotation } from './types';

export const useRotations = () => useApiList<StandbyRotation>('/api/standby-rotations');
export const useDutyRoster = () => useApiList<DutyEntry>('/api/duty-roster');

export const createRotation = (body: Omit<StandbyRotation, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<StandbyRotation>('/api/standby-rotations', body);
export const updateRotation = (id: number, body: Partial<StandbyRotation>) =>
  api.patch<StandbyRotation>(`/api/standby-rotations/${id}`, body);
export const deleteRotation = (id: number) => api.delete(`/api/standby-rotations/${id}`);

export const createDutyEntry = (body: Omit<DutyEntry, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<DutyEntry>('/api/duty-roster', body);
export const updateDutyEntry = (id: number, body: Partial<DutyEntry>) =>
  api.patch<DutyEntry>(`/api/duty-roster/${id}`, body);
export const deleteDutyEntry = (id: number) => api.delete(`/api/duty-roster/${id}`);
