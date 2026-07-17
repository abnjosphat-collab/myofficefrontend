// lib/status.ts — one canonical palette for workflow status + priority chips.
// These colors were defined ad hoc in ~8 pages and disagreed with each other
// ("high" was red in some, amber in others; "low" green/gray/amber). Standardize
// here and feed the hex into the shared <StatusBadge>. Status/priority colors are
// SEMANTIC (green=done, red=urgent) and intentionally independent of the brand color.

const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const ORANGE = '#f97316';
const RED = '#ef4444';
const SLATE = '#94a3b8';
const ROSE = '#f43f5e';

/** Workflow status → hex. Keys are normalized (lowercased, - and _ collapsed). */
const STATUS: Record<string, string> = {
  // not started / awaiting
  pending: AMBER, logged: AMBER, new: AMBER, draft: SLATE, submitted: AMBER,
  // active
  inprogress: BLUE, active: BLUE, ongoing: BLUE, open: BLUE,
  // done
  completed: EMERALD, resolved: EMERALD, closed: EMERALD, approved: EMERALD, done: EMERALD,
  // negative
  rejected: ROSE, cancelled: ROSE, canceled: ROSE, overdue: RED, inactive: ROSE,
  // hold
  onhold: ORANGE, paused: ORANGE,
};

/** Priority → hex. */
const PRIORITY: Record<string, string> = {
  low: SLATE, medium: AMBER, high: ORANGE, critical: RED, urgent: RED,
};

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/[\s_-]+/g, '');
}

/** Color for a workflow status; falls back to slate for unknown values. */
export function statusColor(status?: string | null): string {
  return STATUS[norm(status ?? '')] ?? SLATE;
}

/** Color for a priority; falls back to slate. */
export function priorityColor(priority?: string | null): string {
  return PRIORITY[norm(priority ?? '')] ?? SLATE;
}
