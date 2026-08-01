// app/tasks-events/types.ts — the Events & Tasks board's data model.

export interface TaskEvent {
  id: number;
  title: string;
  description?: string | null;
  task_type: string;
  event_date?: string | null;
  status: 'pending' | 'completed';
  priority: string;
  created_by?: string | null;
  completed_by?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TaskEventFormData {
  title: string;
  description: string;
  task_type: string;
  event_date: string;
  priority: string;
}

export const TASK_TYPES = ['Event', 'Task', 'Meeting', 'Deadline'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High'] as const;
