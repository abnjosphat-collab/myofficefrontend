// app/tasks-events/useTasksEventsData.ts — data-fetching layer for the Events &
// Tasks board. The whole /api/tasks-events router is manager+-gated server-side
// (main.py), same shape as accounting — this hook just calls it like any other.
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { TaskEvent, TaskEventFormData } from './types';

export async function createTaskEvent(data: TaskEventFormData) {
  return api.post<TaskEvent>('/api/tasks-events', data);
}
export async function updateTaskEvent(id: number, data: Partial<TaskEventFormData>) {
  return api.patch<TaskEvent>(`/api/tasks-events/${id}`, data);
}
export async function deleteTaskEvent(id: number) {
  await api.delete(`/api/tasks-events/${id}`);
}
export async function completeTaskEvent(id: number, completedBy: string) {
  return api.patch<TaskEvent>(`/api/tasks-events/${id}`, {
    status: 'completed', completed_by: completedBy, completed_at: new Date().toISOString(),
  });
}
export async function reopenTaskEvent(id: number) {
  return api.patch<TaskEvent>(`/api/tasks-events/${id}`, {
    status: 'pending', completed_by: null, completed_at: null,
  });
}

export function useTasksEventsData() {
  const [items, setItems] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await api.get<unknown>('/api/tasks-events');
      setItems(Array.isArray(data) ? data as TaskEvent[] : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  return { items, loading, refresh };
}
