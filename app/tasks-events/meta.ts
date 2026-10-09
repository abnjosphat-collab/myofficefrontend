// app/tasks-events/meta.ts — tones for type and priority, and the overdue rule.
import type { Tone } from '@/components/ui-system';
import { daysUntil } from '@/lib/dates';
import type { TaskEvent } from './types';
import { priorityTone } from '@/lib/status';

export const TYPE_TONE: Record<string, Tone> = { Event: 'info', Task: 'brand', Meeting: 'neutral', Deadline: 'warning' };
export const PRIORITY_TONE: Record<string, Tone> = { Low: priorityTone('Low'), Medium: priorityTone('Medium'), High: priorityTone('High') };

/** Pending and past its due date (a due date of today is not overdue). */
export const isOverdue = (item: TaskEvent) => item.status === 'pending' && !!item.due_date && daysUntil(item.due_date) < 0;
