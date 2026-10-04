// app/tasks-events/useTasksEventsData.ts — data layer for the Events & Tasks board. The whole /api/tasks-events router is
// manager+ gated server-side (main.py). A failed load is reported, never turned into an empty board; writes throw so the
// caller can show the reason and keep what was typed.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { TaskComment, TaskEvent, TaskEventFormData } from './types';

/** The board's list; mount it only once the caller is known to be a manager. */
export const useTasksEvents = () => useApiList<TaskEvent>('/api/tasks-events');

export const createTaskEvent = (data: TaskEventFormData) => api.post<TaskEvent>('/api/tasks-events', data);
export const updateTaskEvent = (id: number, data: Partial<TaskEventFormData>) => api.patch<TaskEvent>(`/api/tasks-events/${id}`, data);
export const deleteTaskEvent = async (id: number) => { await api.delete(`/api/tasks-events/${id}`); };
export const completeTaskEvent = (id: number, completedBy: string) => api.patch<TaskEvent>(`/api/tasks-events/${id}`, { status: 'completed', completed_by: completedBy, completed_at: new Date().toISOString() });
export const reopenTaskEvent = (id: number) => api.patch<TaskEvent>(`/api/tasks-events/${id}`, { status: 'pending', completed_by: null, completed_at: null });

export async function listComments(taskId: number): Promise<TaskComment[]> {
  const data = await api.get<unknown>(`/api/tasks-events/${taskId}/comments`);
  if (!Array.isArray(data)) throw new Error('The comments came back in an unexpected form.');
  return data as TaskComment[];
}
export const addComment = (taskId: number, text: string, author?: string) => api.post<TaskComment>(`/api/tasks-events/${taskId}/comments`, { text, author });
