// app/leaves/leaveTypes.ts — the leave types and their default reasons. The keys are what the records store: 'compassionate'
// is shown as "Special Leave" but the key must stay, or existing records would fall back to "Annual".
import type { IconMeaning, Tone } from '@/components/ui-system';

export interface LeaveType { name: string; shortName: string; tone: Tone; icon: IconMeaning; description: string }

export const LEAVE_TYPES: Record<string, LeaveType> = {
  annual: { name: 'Annual Leave', shortName: 'Annual', tone: 'info', icon: 'calendar', description: 'Paid time off for rest.' },
  sick: { name: 'Sick Leave', shortName: 'Sick', tone: 'danger', icon: 'care', description: 'Medical and health-related absences.' },
  emergency: { name: 'Emergency Leave', shortName: 'Emergency', tone: 'warning', icon: 'warning', description: 'Urgent personal or family matters.' },
  compassionate: { name: 'Special Leave', shortName: 'Special', tone: 'brand', icon: 'normalize', description: 'Bereavement and family emergencies.' },
  maternity: { name: 'Maternity Leave', shortName: 'Maternity', tone: 'neutral', icon: 'employees', description: 'Parental leave for childbirth.' },
  study: { name: 'Study Leave', shortName: 'Study', tone: 'success', icon: 'training', description: 'Professional development and education.' },
  lieu: { name: 'Leave in Lieu of Overtime', shortName: 'In Lieu', tone: 'neutral', icon: 'clock', description: 'Time off earned from worked overtime.' },
};
export const typeOf = (key: string): LeaveType => LEAVE_TYPES[key] ?? { name: key || 'Unknown type', shortName: key || 'Unknown', tone: 'neutral', icon: 'calendar', description: '' };

/** The reason filled in when the person has not typed their own. */
export function defaultReasonFor(leaveType: string): string {
  switch (leaveType) {
    case 'sick': return 'Sick leave';
    case 'emergency': return 'Family emergency';
    case 'compassionate': return 'Bereavement';
    case 'maternity': return 'Maternity leave';
    case 'study': return 'Study leave';
    case 'lieu': return 'Leave in lieu of overtime';
    default: return 'Annual leave';
  }
}
const DEFAULTS = new Set(Object.keys(LEAVE_TYPES).map(k => defaultReasonFor(k).toLowerCase()));
export const isDefaultReason = (reason: string) => DEFAULTS.has(reason.trim().toLowerCase());
