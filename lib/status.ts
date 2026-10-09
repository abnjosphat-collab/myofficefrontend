// lib/status.ts — what a record state looks like, defined once for every module.
// Colour follows meaning, never the module: a status called "In progress" is the same blue
// on Maintenance, Breakdowns and Services. Modules keep their own labels and icons and take
// the tone from here (`statusTone('in_progress')`), so a meaning is changed in one place.
//
//   neutral  not started, set aside or filed away       draft, cancelled, archived
//   info     underway, nothing needed from you yet      submitted, in progress, paid
//   brand    checked by someone, awaiting the next step reviewed
//   warning  waiting on someone, or soon due            pending, open, on hold, due soon
//   success  done, approved or working                  approved, completed, closed, running
//   danger   needs action now                           overdue, rejected, lost, offline
import type { Tone } from '@/components/ui-system';

const key = (value?: string | null) => (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const STATUS_TONE: Readonly<Record<string, Tone>> = {
  draft: 'neutral', not_started: 'neutral', postponed: 'neutral', not_done: 'neutral', not_required: 'neutral',
  cancelled: 'neutral', archived: 'neutral', returned: 'neutral', retired: 'neutral',
  submitted: 'info', logged: 'info', in_progress: 'info', processing: 'info', scheduled: 'info', paid: 'info', standby: 'info', reserved: 'info',
  reviewed: 'brand',
  pending: 'warning', open: 'warning', on_hold: 'warning', due_soon: 'warning', maintenance: 'warning',
  approved: 'success', completed: 'success', resolved: 'success', closed: 'success', active: 'success', current: 'success', operational: 'success', running: 'success', available: 'success',
  rejected: 'danger', overdue: 'danger', expired: 'danger', lost: 'danger', damaged: 'danger', attention: 'danger', offline: 'danger', out_of_service: 'danger',
};

/** Urgency, priority, criticality and risk all read on one scale. */
export const PRIORITY_TONE: Readonly<Record<string, Tone>> = {
  low: 'neutral', medium: 'info', high: 'warning', critical: 'danger', urgent: 'danger', immediate: 'danger',
};

/**
 * Time away from work, by what it means for the roster rather than by type: planned leave is blue (agreed in
 * advance), unplanned absence amber (sick, emergency: someone must cover), unexcused absence red. Leave types are
 * told apart by name and icon, not by colour. Shared by Leaves and the timesheets.
 */
export const ABSENCE_TONE: Readonly<Record<string, Tone>> = {
  annual: 'info', leave: 'info', compassionate: 'info', special_leave: 'info', maternity: 'info', study: 'info', lieu: 'info', training: 'info',
  sick: 'warning', emergency: 'warning',
  absent: 'danger',
};

/** The physical state of an item (PPE, a compressor, a tool). */
export const CONDITION_TONE: Readonly<Record<string, Tone>> = {
  excellent: 'success', good: 'info', fair: 'warning', poor: 'danger', damaged: 'danger',
};

/** Tone for a status, whatever its spelling ("In Progress", "in-progress", "in_progress"). */
export const statusTone = (status?: string | null, fallback: Tone = 'neutral'): Tone => STATUS_TONE[key(status)] ?? fallback;
export const priorityTone = (priority?: string | null, fallback: Tone = 'neutral'): Tone => PRIORITY_TONE[key(priority)] ?? fallback;
export const conditionTone = (condition?: string | null, fallback: Tone = 'neutral'): Tone => CONDITION_TONE[key(condition)] ?? fallback;
export const absenceTone = (kind?: string | null, fallback: Tone = 'neutral'): Tone => ABSENCE_TONE[key(kind)] ?? fallback;

/**
 * The same tones as text colour in Excel and PDF exports, where CSS tokens cannot reach.
 * Darker than the screen shades so a status stays legible on a white, printed page.
 * Hex without '#', as the export libraries take it.
 */
export const EXPORT_TONE_HEX: Readonly<Record<Tone, string>> = {
  success: '047857', warning: 'B45309', danger: 'B91C1C', info: '1D4ED8', neutral: '475569', brand: '6D28D9',
};

/** `statusColor` for a DownloadButton: colour an exported status cell by what the status means. */
export const exportStatusColor = (status: string) => EXPORT_TONE_HEX[statusTone(status)];
export const exportPriorityColor = (priority: string) => EXPORT_TONE_HEX[priorityTone(priority)];
