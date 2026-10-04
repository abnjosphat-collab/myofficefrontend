// app/sheq/stats.ts — the SHEQ dashboard's pure computation: date-range filtering and the cross-module statistics.
// Kept out of the page so the rules (what counts as a high-risk PTO, how the score is built) are testable.
// Rules worth knowing:
//  - Near-miss records have no status or severity, so nothing about them is inferred beyond their section.
//  - The safety score averages only the parts that have records. A part with nothing to judge is left out, and
//    when no part has data the score is null: an empty period is "no data", not "good standing".

import type { ComputedStats, MonthBucket, QuickRange, RawData, Rec, ScorePart } from './types';

type DatedModule = 'nm' | 'ws' | 'vfl' | 'pto';

export function getDate(r: Rec, module: DatedModule): Date | null {
  const raw = module === 'nm' ? (r.submittedAt || r.date || r.created_at) : (r.created_at || r.date || r.submittedAt);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Records with no usable date are kept, so a range filter never hides a record only because it is undated. */
function inRange(d: Date | null, from: Date | null, to: Date | null) {
  if (!d) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function filterByRange(items: Rec[], module: DatedModule, from: Date | null, to: Date | null): Rec[] {
  if (!from && !to) return items;
  return items.filter(r => inRange(getDate(r, module), from, to));
}

export function rangeToFromTo(quick: QuickRange | 'custom', customFrom: string, customTo: string, now = new Date()): [Date | null, Date | null] {
  if (quick === 'all') return [null, null];
  if (quick === 'custom') return [customFrom ? new Date(customFrom) : null, customTo ? new Date(`${customTo}T23:59:59`) : null];
  const days = quick === '7d' ? 7 : quick === '30d' ? 30 : quick === '90d' ? 90 : 182;
  const from = new Date(now);
  from.setDate(from.getDate() - days);
  return [from, null];
}

export const scoreLabel = (s: number) => (s >= 80 ? 'Good standing' : s >= 60 ? 'Needs attention' : s >= 40 ? 'Concern' : 'Critical');

const monthOf = (r: Rec, keys: string[]) => {
  const raw = keys.map(k => r[k]).find(Boolean);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};
const monthly = (items: Rec[], months: MonthBucket[], keys: string[]) => months.map(m => items.filter(r => { const d = monthOf(r, keys); return d && d.getFullYear() === m.year && d.getMonth() === m.month; }).length);
const countStatus = (items: Rec[], status: string) => items.filter(a => a.status === status).length;
const part = (key: string, label: string, num: number, den: number): ScorePart => ({ key, label, num, den, value: den > 0 ? (num / den) * 100 : null });

export function computeStats(raw: RawData, from: Date | null, to: Date | null, now = new Date()): ComputedStats {
  const nm = filterByRange(raw.nm, 'nm', from, to);
  const ws = filterByRange(raw.ws, 'ws', from, to);
  const vfl = filterByRange(raw.vfl, 'vfl', from, to);
  const pto = filterByRange(raw.pto, 'pto', from, to);
  const pach = (raw.pach || []).filter(r => inRange(monthOf(r, ['date', 'created_at']), from, to));
  const insp = (raw.insp || []).filter(r => inRange(monthOf(r, ['date', 'createdAt']), from, to));

  const wsActions = ws.flatMap(r => r.correctiveActions || []);
  const vflActions = vfl.flatMap(r => r.actions || []);
  const ptoActions = pto.flatMap(r => r.actionPlan || []);
  const findings = insp.flatMap(r => r.findings || []);

  const vflSafe = vfl.filter(r => r.behaviourCategory === 'Safe Behaviour').length;
  const ptoHighRisk = pto.filter(r => r.riskAssessment?.made === 'No' || r.riskAssessment?.identified === 'No' || r.riskAssessment?.effective === 'No').length;
  const inspApproved = countStatus(insp, 'approved');
  const pachClosed = countStatus(pach, 'closed');
  const pachReviewed = countStatus(pach, 'reviewed');

  const actions = { done: 0, prog: 0, pend: 0 };
  for (const list of [wsActions, vflActions, ptoActions]) {
    actions.done += countStatus(list, 'Completed');
    actions.prog += countStatus(list, 'In Progress');
    actions.pend += countStatus(list, 'Pending');
  }
  const totalActions = actions.done + actions.prog + actions.pend;

  const scoreParts = [
    part('vfl', 'VFL safe rate', vflSafe, vfl.length),
    part('pto', 'PTO low risk', pto.length - ptoHighRisk, pto.length),
    part('actions', 'Action completion', actions.done, totalActions),
    part('insp', 'Inspections approved', inspApproved, insp.length),
    part('pach', 'Pachedu resolved', pachClosed + pachReviewed, pach.length),
  ];
  const scored = scoreParts.filter(p => p.value !== null) as (ScorePart & { value: number })[];
  const safetyScore = scored.length ? Math.round(scored.reduce((s, p) => s + p.value, 0) / scored.length) : null;

  const months: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-GB', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  const moduleMonthly = {
    nm: monthly(nm, months, ['submittedAt', 'date', 'created_at']),
    ws: monthly(ws, months, ['created_at', 'date', 'submittedAt']),
    vfl: monthly(vfl, months, ['created_at', 'date', 'submittedAt']),
    pto: monthly(pto, months, ['created_at', 'date', 'submittedAt']),
    insp: monthly(insp, months, ['date', 'createdAt', 'created_at']),
    pach: monthly(pach, months, ['date', 'created_at']),
  };
  months.forEach((m, i) => { m.count = (Object.keys(moduleMonthly) as (keyof typeof moduleMonthly)[]).reduce((n, k) => n + moduleMonthly[k][i], 0); });

  return {
    nm: { total: nm.length, mechanical: nm.filter(r => r.section === 'Mechanical').length, electrical: nm.filter(r => r.section === 'Electrical').length, general: nm.filter(r => r.section === 'General').length },
    ws: { total: ws.length, actDone: countStatus(wsActions, 'Completed'), actPend: countStatus(wsActions, 'Pending'), actProg: countStatus(wsActions, 'In Progress'), actTotal: wsActions.length },
    vfl: {
      total: vfl.length, safe: vflSafe, unsafe: vfl.filter(r => r.behaviourCategory === 'Unsafe Behaviour').length,
      draft: countStatus(vfl, 'draft'), submitted: countStatus(vfl, 'submitted'), closed: countStatus(vfl, 'closed'),
      actDone: countStatus(vflActions, 'Completed'), actPend: countStatus(vflActions, 'Pending'), actProg: countStatus(vflActions, 'In Progress'), actTotal: vflActions.length,
    },
    pto: {
      total: pto.length, highRisk: ptoHighRisk, initial: pto.filter(r => r.observationType === 'Initial').length, followup: pto.filter(r => r.observationType === 'Follow up').length,
      actDone: countStatus(ptoActions, 'Completed'), actPend: countStatus(ptoActions, 'Pending'), actProg: countStatus(ptoActions, 'In Progress'), actTotal: ptoActions.length,
    },
    insp: {
      total: insp.length, draft: countStatus(insp, 'draft'), submitted: countStatus(insp, 'submitted'), approved: inspApproved, rejected: countStatus(insp, 'rejected'),
      openFindings: findings.filter(f => ['open', 'in-progress'].includes(f.status)).length, closedFindings: countStatus(findings, 'closed'),
      criticalFindings: findings.filter(f => f.priority === 'critical').length, overdueFindings: countStatus(findings, 'overdue'),
    },
    pach: {
      total: pach.length, intentional: pach.filter(r => r.behaviourType === 'Intentional').length, unintentional: pach.filter(r => r.behaviourType === 'Unintentional').length,
      draft: countStatus(pach, 'draft'), submitted: countStatus(pach, 'submitted'), reviewed: pachReviewed, closed: pachClosed,
    },
    totals: {
      totalReports: nm.length + ws.length + vfl.length + pto.length + insp.length + pach.length,
      totalActions, totalActionsDone: actions.done, totalActionsProg: actions.prog, totalActionsPend: actions.pend,
    },
    safetyScore, scoreParts, months, moduleMonthly,
  };
}

/** Records created since Monday 00:00 of the current week, per module that has a weekly target. */
export function weeklyActuals(raw: RawData, now = new Date()) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  monday.setHours(0, 0, 0, 0);
  const inWeek = (r: Rec) => { const d = monthOf(r, ['date', 'submittedAt', 'created_at', 'createdAt']); return !!d && d >= monday; };
  return { vfl: raw.vfl.filter(inWeek).length, pto: raw.pto.filter(inWeek).length, insp: raw.insp.filter(inWeek).length, pach: raw.pach.filter(inWeek).length, nm: raw.nm.filter(inWeek).length };
}

export function weekLabel(now = new Date()) {
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} to ${fmt(sunday)} ${sunday.getFullYear()}`;
}
