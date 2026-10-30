// app/ppe/budget/budgetCalc.ts — the 2027 PPE budget calculation: one pure module, tested in budgetCalc.test.ts.
// Everything the screen, the charts and the downloads show comes out of calculateBudget:
// per line per month quantities and costs (with and without the provisional starters),
// totals by month, item and section, gaps, sizes, premature-failure hints and the
// explanation strings the assumptions sheet prints.
import { normalizePpeType } from '../ppeTypes';

export type BudgetRule = 'per_working_day' | 'per_week' | 'per_month' | 'per_year' | 'matrix';
export type WhoKind = 'everyone' | 'sections' | 'job_title';

export interface BudgetWho {
  kind: WhoKind;
  sections: string[];
  text: string;
}

export interface BudgetLineSettings {
  key: string;
  item: string;
  rule: BudgetRule;
  qty_per_person: number;
  who: BudgetWho;
  unit_price: number | null;
  buffer_pct: number;
}

export interface StarterGroupSettings {
  count: number;
  start_month: number;
  boilermakers: number;
}

export interface BudgetSettings {
  lines: BudgetLineSettings[];
  confirmed: StarterGroupSettings;
  provisional: StarterGroupSettings;
  starter_kit: string[] | null;
  add_gaps_in_january: boolean;
  show_provisional: boolean;
}

/** An active person on the register (Engineering only by the time the page passes them in). */
export interface BudgetPerson {
  id: string;
  name: string;
  department: string;
  section: string;
  title: string;
  active: boolean;
}

export interface BudgetRecord {
  employee_id: string;
  employee_name: string;
  ppe_type: string;
  size: string;
  issue_date: string;
  status: string;
  premature_failure?: boolean;
}

export interface BudgetMonthCal {
  month: number;
  working_days: number;
  weeks: number;
  holidays: { date: string; name: string }[];
}

export interface BudgetCalendar {
  year: number;
  months: BudgetMonthCal[];
  total_working_days: number;
  total_weeks: number;
}

export interface StarterSpec {
  label: string;
  startIndex: number;
  isBoilermaker: boolean;
}

export interface BudgetInput {
  people: BudgetPerson[];
  records: BudgetRecord[];
  /** Effective matrix: normalized or raw type -> interval months (0 = no replacement). */
  matrix: Record<string, number>;
  calendar: BudgetCalendar;
  settings: BudgetSettings;
  /** Latest data date, printed on the assumptions sheet (e.g. the newest issue date). */
  dataDate: string;
  /** Reference month for the "last 12 months actuals" chart, YYYY-MM. Defaults to December of year - 1. */
  actualsEnd?: string;
}

export interface LineMonth {
  qty: number;
  cost: number;
  qtyBase: number;
  costBase: number;
  basis: string;
}

export interface LineSizeRow {
  person: string;
  personName: string;
  size: string;
  qty: number;
}

export interface LineResult {
  key: string;
  item: string;
  rule: BudgetRule;
  kind: 'consumable' | 'card';
  unit_price: number | null;
  buffer_pct: number;
  months: LineMonth[];
  yearQty: number;
  yearCost: number;
  yearQtyBase: number;
  yearCostBase: number;
  /** No unit price typed yet: quantities only, flagged on the tiles and the line. */
  noPrice: boolean;
  /** Who/what the line counts (consumables) or whose dues (card items). */
  peopleBasis: string;
  sizes: LineSizeRow[];
}

export interface GapRow {
  person: string;
  personName: string;
  title: string;
  type: string;
}

export interface BudgetResult {
  year: number;
  lines: LineResult[];
  /** Monthly totals across lines: cost and quantity, full and without provisional. */
  monthlyCost: number[];
  monthlyCostBase: number[];
  monthlyQty: number[];
  monthlyQtyBase: number[];
  byItem: { item: string; cost: number; costBase: number; qty: number }[];
  bySection: { section: string; cost: number; costBase: number; qty: number }[];
  gaps: GapRow[];
  gapsAddedInJanuary: GapRow[];
  starterKit: string[];
  unknownTypes: { type: string; count: number }[];
  prematureRate: Record<string, { rate: number; premature: number; total: number }>;
  /** Last 12 months of actual issues per month, {key 'YYYY-MM', label, count}. */
  actuals: { key: string; label: string; count: number }[];
  assumptions: string[];
}

/** Records that still count as held: everything except returned, not-required and archived. */
const DEAD_STATUSES = new Set(['returned', 'not_required', 'archived']);

const normSection = (s: string) => (s ?? '').trim().toLowerCase();

function matchWhoPerson(p: BudgetPerson, who: BudgetWho): boolean {
  if (who.kind === 'everyone') return true;
  if (who.kind === 'sections') return who.sections.some(s => normSection(s) === normSection(p.section));
  return (p.title ?? '').toLowerCase().includes((who.text ?? '').trim().toLowerCase());
}

function matchWhoStarter(s: StarterSpec, who: BudgetWho): boolean {
  if (who.kind === 'everyone') return true;
  // Starters have no section or trade yet. A non-boilermaker starter counts as
  // "everyone"; a boilermaker starter also counts for boilermaker-targeted lines.
  if (who.kind === 'job_title') return s.isBoilermaker && normalizePpeType(who.text).includes('boiler');
  return false;
}

export function monthIndexOf(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec((dateStr ?? '').slice(0, 10));
  if (!m) return -1;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? month - 1 : -1;
}

export function monthKey(year: number, index: number): string {
  return `${year}-${String(index + 1).padStart(2, '0')}`;
}

function addMonths(dateStr: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((dateStr ?? '').slice(0, 10));
  if (!m || !months) return dateStr.slice(0, 10);
  const total = (Number(m[1]) * 12 + (Number(m[2]) - 1)) + months;
  const y = Math.floor(total / 12);
  const mo = (total % 12) + 1;
  const lastDay = new Date(y, mo, 0).getDate();
  return `${y}-${String(mo).padStart(2, '0')}-${String(Math.min(Number(m[3]), lastDay)).padStart(2, '0')}`;
}

/** Loose matrix lookup: exact normalized match first, then the raw keys as written. */
function matrixInterval(matrix: Record<string, number>, rawType: string): number | null {
  const want = normalizePpeType(rawType);
  for (const key of Object.keys(matrix)) {
    if (normalizePpeType(key) === want) return matrix[key];
  }
  return null;
}

function expandStarters(group: StarterGroupSettings, label: string): StarterSpec[] {
  const out: StarterSpec[] = [];
  for (let i = 0; i < group.count; i++) {
    out.push({ label: `${label} starter ${i + 1}`, startIndex: group.start_month - 1, isBoilermaker: i < group.boilermakers });
  }
  return out;
}

function ruleCountForMonth(rule: BudgetRule, cal: BudgetMonthCal): number {
  if (rule === 'per_working_day') return cal.working_days;
  if (rule === 'per_week') return cal.weeks;
  if (rule === 'per_month') return 1;
  return 1 / 12;
}

function withBuffer(raw: number, bufferPct: number): number {
  return Math.ceil(raw * (1 + (bufferPct || 0) / 100));
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function calculateBudget(input: BudgetInput): BudgetResult {
  const { calendar, settings } = input;
  const year = calendar.year;
  const staff = input.people.filter(p => p.active !== false);
  const confirmed = expandStarters(settings.confirmed, 'Confirmed');
  const provisional = expandStarters(settings.provisional, 'Provisional');
  const startersAll = [...confirmed, ...provisional];
  const startersBase = [...confirmed];

  // ── latest held record per person per normalized type ──────────────────
  type Held = { raw: string; issue: string; size: string; name: string; status: string };
  const held = new Map<string, Map<string, Held>>(); // personId -> normType -> held
  const unknownCounts = new Map<string, number>();
  for (const r of input.records) {
    if (!r.employee_id || DEAD_STATUSES.has((r.status ?? '').toLowerCase())) continue;
    const key = normalizePpeType(r.ppe_type);
    if (!key) continue;
    // Match types loosely with normalizePpeType, never by alias (PLAN).
    const interval = matrixInterval(input.matrix, r.ppe_type);
    if (interval === null) {
      unknownCounts.set(r.ppe_type, (unknownCounts.get(r.ppe_type) ?? 0) + 1);
      continue;
    }
    let per = held.get(r.employee_id);
    if (!per) { per = new Map(); held.set(r.employee_id, per); }
    const at = per.get(key);
    if (!at || (r.issue_date ?? '') > at.issue) {
      per.set(key, { raw: r.ppe_type, issue: (r.issue_date ?? '').slice(0, 10), size: r.size ?? '', name: r.employee_name ?? '', status: r.status });
    }
  }

  const normMatrix = new Map<string, number>();
  for (const key of Object.keys(input.matrix)) normMatrix.set(normalizePpeType(key), input.matrix[key]);

  // ── starter kit default: matrix types at least half of current staff hold ──
  let kit = settings.starter_kit;
  if (!kit) {
    kit = [];
    for (const [normType] of normMatrix) {
      if ((normMatrix.get(normType) ?? 0) <= 0) continue;
      let holders = 0;
      for (const p of staff) {
        if (held.get(p.id)?.has(normType)) holders++;
      }
      if (staff.length > 0 && holders * 2 >= staff.length) {
        const raw = [...held.values()].map(m => m.get(normType)?.raw).find(Boolean) ?? normType;
        kit.push(raw);
      }
    }
  }

  // ── gaps: types most of a job title hold that a person never had ──────
  const byTitle = new Map<string, BudgetPerson[]>();
  for (const p of staff) {
    const t = (p.title ?? '').trim() || 'No title';
    if (!byTitle.has(t)) byTitle.set(t, []);
    byTitle.get(t)!.push(p);
  }
  const gaps: GapRow[] = [];
  for (const [title, members] of byTitle) {
    if (members.length < 2) continue;
    const typeHolders = new Map<string, number>();
    for (const m of members) {
      for (const normType of held.get(m.id)?.keys() ?? []) {
        typeHolders.set(normType, (typeHolders.get(normType) ?? 0) + 1);
      }
    }
    for (const [normType, count] of typeHolders) {
      if (count * 2 <= members.length) continue;
      const raw = [...held.values()].map(m => m.get(normType)?.raw).find(Boolean) ?? normType;
      for (const m of members) {
        if (!held.get(m.id)?.has(normType)) gaps.push({ person: m.id, personName: m.name, title, type: raw });
      }
    }
  }

  // ── lines ──────────────────────────────────────────────────────────────
  const lines: LineResult[] = [];
  const cardLines = new Set(settings.lines.filter(l => l.rule === 'matrix').map(l => normalizePpeType(l.item)));
  const priced = new Map(settings.lines.filter(l => l.rule === 'matrix').map(l => [normalizePpeType(l.item), l]));

  // Consumable lines from settings.
  for (const line of settings.lines) {
    if (line.rule === 'matrix') continue;
    const months: LineMonth[] = [];
    let yearQty = 0, yearCost = 0, yearQtyBase = 0, yearCostBase = 0;
    const sectionSplit = new Map<string, { qty: number; qtyBase: number }>();
    for (let m = 0; m < 12; m++) {
      const cal = calendar.months[m];
      const perPerson = ruleCountForMonth(line.rule, cal) * line.qty_per_person;
      const matchedStaff = staff.filter(p => matchWhoPerson(p, line.who));
      const startedAll = startersAll.filter(s => m >= s.startIndex && matchWhoStarter(s, line.who));
      const startedBase = startersBase.filter(s => m >= s.startIndex && matchWhoStarter(s, line.who));
      const count = matchedStaff.length + startedAll.length;
      const countBase = matchedStaff.length + startedBase.length;
      const qty = withBuffer(count * perPerson, line.buffer_pct);
      const qtyBase = withBuffer(countBase * perPerson, line.buffer_pct);
      const cost = line.unit_price == null ? 0 : qty * line.unit_price;
      const costBase = line.unit_price == null ? 0 : qtyBase * line.unit_price;
      yearQty += qty; yearCost += cost; yearQtyBase += qtyBase; yearCostBase += costBase;
      const whoLabel = line.who.kind === 'everyone' ? 'people' : line.who.kind === 'sections' ? line.who.sections.join(', ') : line.who.text;
      months.push({
        qty, cost, qtyBase, costBase,
        basis: `${count} ${whoLabel} × ${cal.working_days} working days`.replace('working days', line.rule === 'per_working_day' ? 'working days' : line.rule === 'per_week' ? `weeks (${cal.weeks})` : line.rule === 'per_month' ? 'month' : 'year ÷ 12'),
      });
      for (const p of matchedStaff) {
        const sec = p.section?.trim() || 'Unassigned';
        const at = sectionSplit.get(sec) ?? { qty: 0, qtyBase: 0 };
        at.qty += perPerson; at.qtyBase += perPerson;
        sectionSplit.set(sec, at);
      }
    }
    lines.push({
      key: line.key, item: line.item, rule: line.rule, kind: 'consumable',
      unit_price: line.unit_price, buffer_pct: line.buffer_pct, months,
      yearQty, yearCost, yearQtyBase, yearCostBase,
      noPrice: line.unit_price == null,
      peopleBasis: line.who.kind === 'everyone' ? 'Everyone on the register' : line.who.kind === 'sections' ? `Sections: ${line.who.sections.join(', ')}` : `Job title contains "${line.who.text}"`,
      sizes: [],
      _sectionSplit: sectionSplit,
    } as LineResult & { _sectionSplit: Map<string, { qty: number; qtyBase: number }> });
  }

  // Card lines: one per matrix type with a known interval, dues rolled forward into the year.
  const staffById = new Map(staff.map(p => [p.id, p]));
  for (const [normType, interval] of normMatrix) {
    const setting = priced.get(normType);
    const raw = setting?.item ?? [...held.values()].map(m => m.get(normType)?.raw).find(Boolean) ?? normType;
    const price = setting?.unit_price ?? null;
    const buffer = setting?.buffer_pct ?? 0;
    const months: LineMonth[] = Array.from({ length: 12 }, () => ({ qty: 0, cost: 0, qtyBase: 0, costBase: 0, basis: '' }));
    const sizes: LineSizeRow[] = [];
    const sectionQty = new Map<string, { qty: number; qtyBase: number }>();
    let peopleBasis = 'Nobody holds this type yet';
    {
      const dues: { month: number; person: string; name: string; size: string; provisional: boolean }[] = [];
      const jan1 = `${year}-01-01`;
      const dec31 = `${year}-12-31`;
      const collect = (personId: string, name: string, size: string, firstIssue: string, isProvisional: boolean, lostOrDamaged: boolean) => {
        // Lost or damaged: the item is gone, so the replacement falls in January.
        let due = lostOrDamaged ? jan1 : addMonths(firstIssue, interval);
        while (due < jan1) due = addMonths(due, interval);
        while (due >= jan1 && due <= dec31) {
          dues.push({ month: monthIndexOf(due), person: personId, name, size, provisional: isProvisional });
          due = addMonths(due, interval);
        }
      };
      if (interval > 0) {
        for (const p of staff) {
          const h = held.get(p.id)?.get(normType);
          if (!h) continue;
          const lost = h.status === 'lost' || h.status === 'damaged';
          collect(p.id, p.name || h.name, h.size, h.issue || `${year - 1}-01-01`, false, lost);
        }
      }
      // Starters: the kit itself is bought in the start month, then replaced on the interval within the year.
      const kitHas = (kit ?? []).some(k => normalizePpeType(k) === normType);
      if (kitHas) {
        for (const s of confirmed) {
          dues.push({ month: s.startIndex, person: `starter:${s.label}`, name: s.label, size: '', provisional: false });
          if (interval > 0) collect(`starter:${s.label}`, s.label, '', monthKey(year, s.startIndex) + '-01', false, false);
        }
        for (const s of provisional) {
          dues.push({ month: s.startIndex, person: `starter:${s.label}`, name: s.label, size: '', provisional: true });
          if (interval > 0) collect(`starter:${s.label}`, s.label, '', monthKey(year, s.startIndex) + '-01', true, false);
        }
      }
      // Gaps added in January when the toggle is on.
      const gapDues = settings.add_gaps_in_january ? gaps.filter(g => normalizePpeType(g.type) === normType && !held.get(g.person)?.has(normType)) : [];
      for (const g of gapDues) dues.push({ month: 0, person: g.person, name: g.personName, size: '', provisional: false });
      const holders = new Set(dues.filter(d => !d.provisional).map(d => d.person));
      peopleBasis = holders.size === 0 ? 'Nobody holds this type yet' : `${holders.size} holder${holders.size === 1 ? '' : 's'}`;
      const byPersonSize = new Map<string, { name: string; size: string; qty: number; qtyBase: number }>();
      dues.forEach(d => {
        const at = byPersonSize.get(d.person) ?? { name: d.name, size: d.size, qty: 0, qtyBase: 0 };
        at.qty += 1;
        if (!d.provisional) at.qtyBase += 1;
        byPersonSize.set(d.person, at);
      });
      for (const [person, at] of byPersonSize) {
        if (at.qty > 0) sizes.push({ person, personName: at.name, size: at.size, qty: at.qty });
      }
      for (let m = 0; m < 12; m++) {
        const inMonth = dues.filter(d => d.month === m);
        const qty = withBuffer(inMonth.length, buffer);
        const qtyBase = withBuffer(inMonth.filter(d => !d.provisional).length, buffer);
        months[m] = {
          qty, cost: price == null ? 0 : qty * price,
          qtyBase, costBase: price == null ? 0 : qtyBase * price,
          basis: inMonth.length === 0 ? '' : inMonth.map(d => `${d.name} due ${monthKey(year, m).slice(5)}`).slice(0, 3).join('; ') + (inMonth.length > 3 ? ` +${inMonth.length - 3} more` : ''),
        };
        for (const d of inMonth) {
          const sec = staffById.get(d.person)?.section?.trim() || 'Unassigned';
          const at = sectionQty.get(sec) ?? { qty: 0, qtyBase: 0 };
          at.qty += 1;
          if (!d.provisional) at.qtyBase += 1;
          sectionQty.set(sec, at);
        }
      }
      // Apply the buffer at the month level already done; section split stays raw.
    }
    const yearQty = months.reduce((t, m) => t + m.qty, 0);
    const yearCost = months.reduce((t, m) => t + m.cost, 0);
    const yearQtyBase = months.reduce((t, m) => t + m.qtyBase, 0);
    const yearCostBase = months.reduce((t, m) => t + m.costBase, 0);
    lines.push({
      key: `card:${normType}`, item: raw, rule: 'matrix', kind: 'card',
      unit_price: price, buffer_pct: buffer, months,
      yearQty, yearCost, yearQtyBase, yearCostBase,
      noPrice: price == null,
      peopleBasis,
      sizes: sizes.sort((a, b) => a.personName.localeCompare(b.personName)),
      _sectionSplit: sectionQty,
    } as LineResult & { _sectionSplit: Map<string, { qty: number; qtyBase: number }> });
  }
  void cardLines;

  // ── premature-failure hint: last 12 months' rate per type ─────────────
  const prematureRate: BudgetResult['prematureRate'] = {};
  const cutoff = `${year - 1}-01-01`;
  const byType = new Map<string, { premature: number; total: number }>();
  for (const r of input.records) {
    const issue = (r.issue_date ?? '').slice(0, 10);
    if (issue < cutoff) continue;
    const key = normalizePpeType(r.ppe_type);
    if (!key) continue;
    const at = byType.get(key) ?? { premature: 0, total: 0 };
    at.total += 1;
    if (r.premature_failure) at.premature += 1;
    byType.set(key, at);
  }
  for (const [key, at] of byType) {
    prematureRate[key] = { ...at, rate: at.total === 0 ? 0 : at.premature / at.total };
  }

  // ── actuals: issues per month for the 12 months ending actualsEnd ──────
  const actuals: BudgetResult['actuals'] = [];
  const endKey = input.actualsEnd ?? `${year - 1}-12`;
  const [endY, endM] = endKey.split('-').map(Number);
  for (let back = 11; back >= 0; back--) {
    const total = (endY * 12 + (endM - 1)) - back;
    const y = Math.floor(total / 12);
    const mo = (total % 12) + 1;
    const key = `${y}-${String(mo).padStart(2, '0')}`;
    const count = input.records.filter(r => (r.issue_date ?? '').slice(0, 7) === key).length;
    actuals.push({ key, label: `${MONTH_NAMES[mo - 1]} ${y}`, count });
  }

  // ── totals ─────────────────────────────────────────────────────────────
  const monthlyCost = Array(12).fill(0);
  const monthlyCostBase = Array(12).fill(0);
  const monthlyQty = Array(12).fill(0);
  const monthlyQtyBase = Array(12).fill(0);
  for (const l of lines) {
    l.months.forEach((m, i) => {
      monthlyCost[i] += m.cost; monthlyCostBase[i] += m.costBase;
      monthlyQty[i] += m.qty; monthlyQtyBase[i] += m.qtyBase;
    });
  }
  const byItem = lines.map(l => ({ item: l.item, cost: l.yearCost, costBase: l.yearCostBase, qty: l.yearQty }));
  const sectionAgg = new Map<string, { cost: number; costBase: number; qty: number }>();
  for (const l of lines) {
    const split = (l as LineResult & { _sectionSplit?: Map<string, { qty: number; qtyBase: number }> })._sectionSplit;
    if (!split) continue;
    const unit = l.unit_price ?? 0;
    for (const [sec, q] of split) {
      const at = sectionAgg.get(sec) ?? { cost: 0, costBase: 0, qty: 0 };
      at.qty += q.qty; at.cost += q.qty * unit; at.costBase += q.qtyBase * unit;
      sectionAgg.set(sec, at);
    }
    delete (l as LineResult & { _sectionSplit?: unknown })._sectionSplit;
  }
  const bySection = [...sectionAgg.entries()].map(([section, v]) => ({ section, ...v }));

  const gapsAddedInJanuary = settings.add_gaps_in_january ? gaps : [];
  const monthNames = calendar.months.map(m => MONTH_NAMES[m.month - 1]).join(', ');
  const holidayNames = [...new Set(calendar.months.flatMap(m => m.holidays.map(h => `${h.name} (${h.date})`)))];
  const assumptions = [
    `Working days are Monday to Friday minus Zimbabwe public holidays: ${calendar.total_working_days} days in ${year} (${monthNames}).`,
    `Weekly items count one per week starting on a Monday: ${calendar.total_weeks} weeks in ${year}.`,
    `Holidays excluded on weekdays: ${holidayNames.length === 0 ? 'none' : holidayNames.join('; ')}.`,
    `Consumable quantities are whole numbers per month (rounded up): people × the month's working days, weeks, months or 1/12 of the year.`,
    `Card items fall on each holder's own due dates (last issue + the matrix interval, rolled forward): interval 0 means no replacement.`,
    `Types the matrix doesn't know are listed with no replacement interval and never projected: ${[...unknownCounts.keys()].join(', ') || 'none'}.`,
    `Starter kit: ${kit && kit.length > 0 ? kit.join(', ') : 'each matrix type at least half of staff hold'} (1 each in the start month, then replaced on interval).`,
    `Provisional starters are ${settings.show_provisional ? 'included' : 'excluded'} in the headline totals.`,
    `Data date: ${input.dataDate}.`,
  ];

  return {
    year,
    lines: lines.sort((a, b) => b.yearCost - a.yearCost || a.item.localeCompare(b.item)),
    monthlyCost, monthlyCostBase, monthlyQty, monthlyQtyBase,
    byItem: byItem.sort((a, b) => b.cost - a.cost),
    bySection: bySection.sort((a, b) => b.cost - a.cost),
    gaps: gaps.sort((a, b) => a.personName.localeCompare(b.personName)),
    gapsAddedInJanuary,
    starterKit: kit ?? [],
    unknownTypes: [...unknownCounts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    prematureRate,
    actuals,
    assumptions,
  };
}
