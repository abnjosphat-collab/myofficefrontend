// lib/reliability.ts — the breakdown record shape and the pure derivation of every reliability figure
// from raw breakdown records, shared by /reliability and /engineering-dashboard. There is no fallback
// data: no records means no figures (pages say so).

export interface EquipReliability {
  equipment: string; section: string; mtbf: number; mttr: number; failures: number; availability: number; rpn: number;
  /** Total recorded downtime in hours. */
  downtimeHours: number;
}

export interface BreakdownRecord {
  equipment_name?: string; section?: string; location?: string;
  downtime_hours?: number; duration_hours?: number;
  breakdown_date?: string; date?: string; created_at?: string;
}

export interface SectionMttr { section: string; mttr: number }
export interface MonthlyFailures { key: string; month: string; failures: number }
export interface Reliability { table: EquipReliability[]; sections: SectionMttr[]; monthly: MonthlyFailures[] }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const recordDate = (bd: BreakdownRecord, fallback: Date) => new Date(bd.breakdown_date || bd.date || bd.created_at || fallback);

export function deriveReliability(records: readonly BreakdownRecord[], now: Date = new Date()): Reliability {
  const byEquipment = new Map<string, { failures: number; downtime: number; first: Date; section: string }>();
  for (const bd of records) {
    const name = bd.equipment_name || 'Unknown';
    const entry = byEquipment.get(name) ?? { failures: 0, downtime: 0, first: now, section: bd.section || bd.location || '—' };
    entry.failures += 1;
    entry.downtime += Number(bd.downtime_hours || bd.duration_hours || 0);
    const date = recordDate(bd, now);
    if (date < entry.first) entry.first = date;
    byEquipment.set(name, entry);
  }

  const table = [...byEquipment.entries()].map(([equipment, v]): EquipReliability => {
    const periodDays = Math.max(1, (now.getTime() - v.first.getTime()) / 86400000);
    const mtbf = Math.round(periodDays / Math.max(1, v.failures));
    const mttr = Math.round((v.downtime / v.failures) * 10) / 10;
    const availability = Math.max(0, Math.round((1 - v.downtime / (periodDays * 24)) * 1000) / 10);
    const rpn = Math.round((5 - Math.min(4, mtbf / 10)) * Math.max(1, mttr) * 3);
    return { equipment, section: v.section, mtbf, mttr, failures: v.failures, availability, rpn, downtimeHours: Math.round(v.downtime * 10) / 10 };
  }).sort((a, b) => b.rpn - a.rpn);

  const bySection = new Map<string, number[]>();
  for (const bd of records) {
    const section = bd.section || bd.location || 'Other';
    bySection.set(section, [...(bySection.get(section) ?? []), Number(bd.downtime_hours || 0)]);
  }
  const sections = [...bySection.entries()].map(([section, hours]) => ({ section, mttr: Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 }));

  // Last six calendar months including the current one, oldest first; months with no failures show 0.
  const monthly: MonthlyFailures[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, month: MONTHS[d.getMonth()], failures: 0 };
  });
  for (const bd of records) {
    const d = recordDate(bd, now);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const slot = monthly.find(m => m.key === key);
    if (slot) slot.failures += 1;
  }
  return { table, sections, monthly };
}

export const fleetFigures = (table: readonly EquipReliability[]) => {
  const n = Math.max(1, table.length);
  return {
    mtbf: Math.round(table.reduce((s, e) => s + e.mtbf, 0) / n),
    mttr: (table.reduce((s, e) => s + e.mttr, 0) / n).toFixed(1),
    availability: (table.reduce((s, e) => s + e.availability, 0) / n).toFixed(1),
    highRpn: table.filter(e => e.rpn > 100).length,
  };
};

/** Breakdown count and mean repair time for the calendar month containing `now`. `mttr` is null when there were none. */
export function monthSummary(records: readonly BreakdownRecord[], now: Date = new Date()): { failures: number; mttr: number | null } {
  const inMonth = records.filter(bd => {
    const d = recordDate(bd, now);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  if (inMonth.length === 0) return { failures: 0, mttr: null };
  const hours = inMonth.reduce((sum, bd) => sum + Number(bd.downtime_hours || bd.duration_hours || 0), 0);
  return { failures: inMonth.length, mttr: Math.round((hours / inMonth.length) * 10) / 10 };
}
