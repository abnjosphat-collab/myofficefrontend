// app/maintenance/registers.ts — what a register picker needs, as plain functions: turn the employees, leave and Tools registers into
// options, rank the matches for what was typed, and say why an option cannot be chosen. No React here, so every rule is unit-tested.
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { LeaveRow, ToolRegisterRow } from './types';

/** One choice in a register picker. `value` is the text that is written into the form. */
export interface RegisterOption {
  value: string;
  /** Second line: section, make and model, and so on. */
  description?: string;
  /** Set when the option is shown but cannot be chosen (a person on leave). */
  blocked?: string;
  /** Set when the option can be chosen but deserves a warning (a tool that is overdue or due an inspection). */
  warning?: string;
  /** The register's own key, kept when the thing is picked (a tool's register number). */
  key?: string;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** The option whose text is exactly `value` (ignoring case and spacing), or null: the field shows this as "from the register". */
export function findMatch(options: RegisterOption[], value: string): RegisterOption | null {
  const wanted = norm(value);
  return wanted ? options.find(o => norm(o.value) === wanted) ?? null : null;
}

/** Up to `limit` options for what was typed: the start of the text first, then the start of a word, then anywhere. Blank shows the first few. */
export function matchOptions(options: RegisterOption[], query: string, limit = 8): RegisterOption[] {
  const q = norm(query);
  if (!q) return options.slice(0, limit);
  const rank = (o: RegisterOption): number => {
    const text = norm(`${o.value} ${o.key ?? ''}`);
    if (norm(o.value).startsWith(q) || norm(o.key ?? '').startsWith(q)) return 0;
    if (text.split(' ').some(w => w.startsWith(q))) return 1;
    return text.includes(q) ? 2 : 3;
  };
  return options.map(o => ({ o, r: rank(o) })).filter(x => x.r < 3).sort((a, b) => a.r - b.r || a.o.value.localeCompare(b.o.value)).slice(0, limit).map(x => x.o);
}

/** The option Tab fills: the highlighted one when it can be chosen, otherwise the first one that can. */
export function tabTarget(matches: RegisterOption[], highlighted: number): RegisterOption | null {
  const current = matches[highlighted];
  if (current && !current.blocked) return current;
  return matches.find(o => !o.blocked) ?? null;
}

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
/** "14 Aug" from an ISO date, or the text unchanged when it is not one. */
export function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : SHORT_DATE.format(d);
}

/** "On annual leave, 5 Aug to 14 Aug": the reason and the dates, as shown beside a greyed name. */
export function leaveReason(leave: Pick<LeaveRow, 'leave_type' | 'start_date' | 'end_date'>): string {
  const kind = (leave.leave_type || 'leave').toLowerCase();
  return `On ${kind.endsWith('leave') ? kind : `${kind} leave`}, ${shortDate(leave.start_date)} to ${shortDate(leave.end_date)}`;
}

export const employeeName = (e: EmployeeLookup): string => (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim();

/**
 * People from the employees register, each greyed with the reason and dates when on approved leave. `leaves` are the people on leave
 * on the day in question (the server's list); a person is matched by employee number first, then by name.
 */
export function personOptions(employees: EmployeeLookup[], leaves: LeaveRow[], blockLeave = true): RegisterOption[] {
  const byNumber = new Map(leaves.filter(l => l.employee_id).map(l => [norm(String(l.employee_id)), l]));
  const byName = new Map(leaves.map(l => [norm(l.employee_name || ''), l]));
  const seen = new Set<string>();
  const out: RegisterOption[] = [];
  for (const e of employees) {
    const name = employeeName(e);
    if (!name || seen.has(norm(name))) continue;
    seen.add(norm(name));
    const leave = (e.employee_id ? byNumber.get(norm(String(e.employee_id))) : undefined) ?? byName.get(norm(name));
    out.push({
      value: name,
      key: e.employee_id ? String(e.employee_id) : undefined,
      description: [e.designation || e.position, e.section || e.department].filter(Boolean).join(' · ') || undefined,
      ...(leave && blockLeave ? { blocked: leaveReason(leave) } : {}),
    });
  }
  return out.sort((a, b) => a.value.localeCompare(b.value));
}

const STATUS_WORDS: Record<string, string> = { issued: 'Issued', overdue: 'Overdue', attention: 'Needs attention' };

/** Why a tool deserves a second look before it goes on a job, or undefined when it is fine. Maintenance warns; /tools issues. */
export function toolWarning(tool: ToolRegisterRow): string | undefined {
  const parts: string[] = [];
  if (tool.status === 'issued' || tool.status === 'overdue') {
    parts.push(`${STATUS_WORDS[tool.status]}${tool.holder ? ` to ${tool.holder}` : ''}${tool.expected_return_at ? `, back ${shortDate(tool.expected_return_at)}` : ''}`);
  } else if (tool.status === 'attention') parts.push(STATUS_WORDS.attention);
  if (tool.inspection_due.length) parts.push(`${tool.inspection_due.join(', ')} inspection due`);
  return parts.length ? parts.join('. ') : undefined;
}

/** Tools from the Tools & Equipment register. Their register number is kept so the job can say exactly which tool. */
export function toolOptions(tools: ToolRegisterRow[]): RegisterOption[] {
  return tools.map(t => ({
    value: t.name,
    key: t.register_number,
    description: [t.register_number, t.make_model, t.category].filter(Boolean).join(' · ') || undefined,
    warning: toolWarning(t),
  }));
}
