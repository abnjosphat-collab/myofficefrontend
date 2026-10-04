// app/equipment/api.ts — the equipment register's writes. The list is read with useApiList on the page (honest state).
'use client';

import { api } from '@/lib/apiClient';
import type { EquipmentItem } from './types';

export const createEquipment = (body: Record<string, unknown>) => api.post<EquipmentItem>('/api/equipment', body);
export const updateEquipment = (id: number | string, body: Record<string, unknown>) => api.put<EquipmentItem>(`/api/equipment/${id}`, body);
export const deleteEquipment = async (id: number | string) => { await api.delete(`/api/equipment/${id}`); };
