// app/overtime/calcOvertime.ts — the pure calculation logic behind the Weekly Summary
// (per-employee daily/weekly rollup) and the Similar-Reason grouping heuristic, split out
// of page.tsx per the "extract + test business logic" standard (app/timesheets/calcTotals.ts
// precedent). Previously inline in page.tsx with no test coverage at all.
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { OTRecord, OTType } from './types';

// ─── HOURS / RATE ─────────────────────────────────────────────────────────────

// Pay-rate multiplier by overtime type — weekend/holiday work is paid double time,
// everything else (incl. legacy emergency/project/night records) is time-and-a-half.
export function rateFor(type: OTType): 1.5 | 2.0 {
  return type === 'weekend' || type === 'holiday' ? 2.0 : 1.5;
}

export function calcHours(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  // Overnight job — end time is on the next day (e.g. 23:00 -> 00:00 is a
  // continuous 1-hour shift, not "start after end").
  if (diff < 0) diff += 24 * 60;
  return Math.max(0, diff / 60);
}

// ─── WEEKLY SUMMARY (per-employee daily/weekly rollup) ────────────────────────
// Replaces the fragile manual-Excel workflow: a week spanning two months used to
// need a cross-sheet formula that was easy to get wrong. This rolls up however
// many days of OT records the user picks (default: the last completed Mon–Sun cycle,
// but freely adjustable to any range) into one employee × day matrix, live in the UI
// and as a styled Excel download.

export function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since the most recent Monday (Mon=0 .. Sun=6)
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
export function toISODate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export interface EmployeeWeekRow {
  employee_id: string; employee_name: string; position: string; byDate: Map<string, number>; total: number;
  // Per-individual rate split — the 1.5x/2.0x breakdown belongs to the person whose
  // hours they are, not to the day they fall on (a day can mix both rates across
  // different employees, or even within one employee's own records).
  total15: number; total20: number;
}

// Excluded from the weekly roster by name/role rather than editing the query, so
// it stays visible and easy to adjust in one place. Roles matched case-
// insensitively against designation/position (covers "Manager", "Senior
// Manager", "Graduate Trainee", "Hoist Driver", …). Named individuals are
// matched by single name token (first name or surname alone) since designation
// text alone doesn't reliably identify them — spelled exactly as given; if any
// don't match the roster's actual spelling, flag it and they'll get added.
export const EXCLUDED_ROLE_SUBSTRINGS = ['manager', 'trainee', 'foreman', 'hoist driver'];
export const EXCLUDED_NAME_TOKENS = [
  'mavhondo', 'toderai', 'tonderai', 'tavonameso', 'chibvongodze', 'pedzisai', // named exclusions
  'chimhanda', 'chiwara', 'gasseler', 'pnashe',       // graduate trainees, by name (belt-and-braces alongside the role match above)
];

export function isExcludedFromWeeklyRoster(emp: EmployeeLookup): boolean {
  const role = `${emp.designation || emp.position || ''}`.toLowerCase();
  if (EXCLUDED_ROLE_SUBSTRINGS.some(s => role.includes(s))) return true;
  const name = `${emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`}`.toLowerCase();
  if (name.includes('antonio') && role.includes('driver')) return true; // one specific driver, matched by name+role together
  if (EXCLUDED_NAME_TOKENS.some(t => name.includes(t))) return true;
  return false;
}

export function buildWeeklyRows(records: OTRecord[], from: string, to: string, roster: EmployeeLookup[]): { rows: EmployeeWeekRow[]; days: Date[] } {
  const days: Date[] = [];
  if (from <= to) {
    let d = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T00:00:00`);
    while (d <= end) { days.push(d); d = addDays(d, 1); }
  }

  const map = new Map<string, EmployeeWeekRow>();

  // Seed every roster employee first (minus exclusions) so people with zero OT
  // hours this period still get a row of 0s instead of being left off entirely.
  roster.forEach(emp => {
    if (isExcludedFromWeeklyRoster(emp)) return;
    const name = emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    if (!name) return;
    // Same key fallback as the records loop below (employee_id, else name) — keeping
    // them identical is what lets a roster-seeded row and that person's actual OT
    // records land on the same row instead of creating a duplicate.
    const key = emp.employee_id || name;
    map.set(key, { employee_id: emp.employee_id || '', employee_name: name, position: emp.designation || emp.position || '', byDate: new Map(), total: 0, total15: 0, total20: 0 });
  });

  records.forEach(r => {
    if (r.date < from || r.date > to) return;
    const key = r.employee_id || r.employee_name;
    if (!key) return;
    if (!map.has(key)) map.set(key, { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, byDate: new Map(), total: 0, total15: 0, total20: 0 });
    const row = map.get(key)!;
    const h = r.hours ?? calcHours(r.start_time, r.end_time);
    row.byDate.set(r.date, (row.byDate.get(r.date) || 0) + h);
    row.total += h;
    if (rateFor(r.overtime_type) === 1.5) row.total15 += h; else row.total20 += h;
  });

  return { rows: Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name)), days };
}

// ─── SIMILAR-REASON GROUPING (Weekly Summary) ──────────────────────────────────
// Free-text overtime reasons are typed independently by whoever logs the entry, so the
// same recurring task ends up worded differently by different people — "Burnet daily
// checks" vs "Burnett daily check", "Purchase of backshift tools" vs "purchasing tools
// for back-shifts" — and reads as N separate one-off causes instead of one recurring
// one. This groups by rough text similarity (fuzzy token overlap, tolerant of typos and
// singular/plural) rather than exact string match. Pure client-side heuristic, no AI
// call — deliberately separate from the Causes & Actions tab's LLM-driven analysis.

// Some reasons were typed with no space between a word and a number that follows it
// (e.g. "monitoring2.5 ton dc loco") — insert one wherever a 3+ letter word runs
// straight into a digit or vice versa. The 3+ threshold is what keeps this from
// mangling short alphanumeric codes ("C1165") or compound terms ("4x4"), whose letter
// run next to the digit is 1-2 characters.
export function cleanReasonText(s: string): string {
  return s.replace(/([A-Za-z]{3,})(\d)/g, '$1 $2').replace(/(\d)([A-Za-z]{3,})/g, '$1 $2');
}

export const REASON_STOPWORDS = new Set(['of', 'for', 'the', 'a', 'an', 'to', 'and', 'on', 'at', 'in', 'from', 'with', 'as', 'is', 'was', 'were']);
export function significantTokens(s: string): string[] {
  return cleanReasonText(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 1 && !REASON_STOPWORDS.has(w));
}

export function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Two tokens count as "the same word" if identical, share a long-enough prefix (catches
// purchase/purchasing/purchaise-style variants), or sit within a small edit distance of
// each other (typos, singular/plural).
export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) return true;
  return levenshtein(a, b) <= (Math.max(a.length, b.length) <= 5 ? 1 : 2);
}

// Fraction of the smaller token set that has a fuzzy match in the other — 1.0 means
// every word in the shorter phrase matched something in the longer one.
export function reasonSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const used = new Set<number>();
  let matched = 0;
  for (const ta of a) {
    for (let i = 0; i < b.length; i++) {
      if (used.has(i)) continue;
      if (tokensMatch(ta, b[i])) { matched++; used.add(i); break; }
    }
  }
  return matched / Math.min(a.length, b.length);
}

export const REASON_SIMILARITY_THRESHOLD = 0.6;

export function groupSimilarReasons(records: OTRecord[]): { label: string; hours: number; count: number; peopleCount: number }[] {
  const clusters: { label: string; hours: number; count: number; employees: Set<string>; tokens: string[] }[] = [];
  records.forEach(r => {
    const raw = (r.reason || '').trim();
    if (!raw) return;
    const clean = cleanReasonText(raw);
    const tokens = significantTokens(clean);
    if (tokens.length === 0) return;
    const hours = r.hours ?? calcHours(r.start_time, r.end_time);
    const person = r.employee_id || r.employee_name;

    let best: (typeof clusters)[number] | null = null;
    let bestScore = 0;
    for (const c of clusters) {
      const score = reasonSimilarity(tokens, c.tokens);
      if (score >= REASON_SIMILARITY_THRESHOLD && score > bestScore) { best = c; bestScore = score; }
    }
    if (best) {
      best.hours += hours;
      best.count += 1;
      best.employees.add(person);
      // Keep the longer, more descriptive phrasing as the group's representative label.
      if (clean.length > best.label.length) best.label = clean;
    } else {
      clusters.push({ label: clean, hours, count: 1, employees: new Set([person]), tokens });
    }
  });
  return clusters
    .map(c => ({ label: c.label, hours: Math.round(c.hours * 10) / 10, count: c.count, peopleCount: c.employees.size }))
    .sort((a, b) => b.hours - a.hours);
}
