// app/standby/useStandbyData.ts — the standby page's data layer: standby and duty
// rotations, duty overrides, covers, and the writes. Every read reports its own
// failure; a source that could not be loaded is named, never treated as
// "nobody on standby".
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';

export const useRotations = () => useApiList<StandbyRotation>('/api/standby-rotations');
export const useDutyRoster = () => useApiList<DutyEntry>('/api/duty-roster');
export const useDutyRotations = () => useApiList<DutyRotation>('/api/duty-rotations');
export const useCovers = () => useApiList<RotationCover>('/api/rotation-covers');

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

export const createDutyRotation = (body: Omit<DutyRotation, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<DutyRotation>('/api/duty-rotations', body);
export const updateDutyRotation = (id: number, body: Partial<DutyRotation>) =>
  api.patch<DutyRotation>(`/api/duty-rotations/${id}`, body);
export const deleteDutyRotation = (id: number) => api.delete(`/api/duty-rotations/${id}`);

export const createCover = (body: Omit<RotationCover, 'id' | 'created_at' | 'updated_at'>) =>
  api.post<RotationCover>('/api/rotation-covers', body);
export const updateCover = (id: number, body: Partial<RotationCover>) =>
  api.patch<RotationCover>(`/api/rotation-covers/${id}`, body);
export const deleteCover = (id: number) => api.delete(`/api/rotation-covers/${id}`);
