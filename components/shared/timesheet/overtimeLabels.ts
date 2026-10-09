// components/shared/timesheet/overtimeLabels.ts — the overtime module's record types as short display labels,
// shared by the artisan and NEC day breakdowns.
const OT_TYPE_LABELS: Record<string, string> = {
  weekend: 'Weekend', holiday: 'Holiday', regular: 'Regular',
  emergency: 'Emergency', project: 'Project', night: 'Night',
};

/** 'emergency' → 'Emergency'; an unknown type is capitalized, a missing one reads 'Overtime'. */
export const otTypeLabel = (t: string) => OT_TYPE_LABELS[t] ?? (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Overtime');
