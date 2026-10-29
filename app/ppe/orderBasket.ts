// app/ppe/orderBasket.ts — the pure rules behind the order basket: which records
// join the order list on their own (due now), how the stored lines (flagged by
// hand, free lines, exclusions) combine with them, and which records the "add"
// entry points may offer. The page builds the basket from records + stored lines
// + the roster; the hook only moves stored lines (see useOrderList).
import { normalizeSection } from '@/lib/sections';
import { mondayOf, normalizeEmployeeId, toISODate, type OrderListEntry } from './calcPPE';
import type { PPERecord } from './types';

/** Roster lookups, keyed by normalised id (see normalizeEmployeeId). Built by the page from the roster rows. */
export interface BasketRegister {
  known: Set<string>;
  archived: Set<string>;
  /** Each person's current section (normalised id → section as stored on the register). */
  sections?: Map<string, string>;
}

/** A line on screen: a stored line keeps its shape; an automatic line is built from its record. */
export interface BasketLine extends OrderListEntry {
  origin: 'auto' | 'manual' | 'free';
}

export interface BasketCounts { auto: number; manual: number; free: number; excluded: number; }

export interface Basket {
  /** Automatic lines first, then manual, then free (the view sorts within). Twins are banner-only, never lines. */
  lines: BasketLine[];
  counts: BasketCounts;
  /** Stored exclusions (the "excluded" disclosure restores them). */
  excluded: OrderListEntry[];
  /** Manual lines whose record already joins on its own — the banner offers to remove them. */
  twins: OrderListEntry[];
  /** Kind-less (legacy) lines outside the automatic set — the banner offers to keep or remove them. */
  notDueLegacy: OrderListEntry[];
  /** Flagged lines whose item has been renewed since (the record's expiry moved on and it is not due within 30 days):
   *  never ordered, banner-only, offered for removal. Lines moved off a single browser's list carried no expiry, so a
   *  missing stored expiry against a far-off record expiry counts as renewed too. */
  renewed: OrderListEntry[];
}

/** Days a flagged line's item may still be from its expiry and stay on the list as an early order. */
export const EARLY_ORDER_DAYS = 30;

/** Due now: active, with an expiry on or before today, on the register, not archived. No-expiry actives are never due. */
export function dueNow(records: PPERecord[], register: BasketRegister, todayISO: string): PPERecord[] {
  return records.filter(r =>
    r.status === 'active'
    && !!r.expiry_date
    && r.expiry_date <= todayISO
    && register.known.has(normalizeEmployeeId(r.employee_id))
    && !register.archived.has(normalizeEmployeeId(r.employee_id)),
  );
}

/** An exclusion id carries the record id plus the expiry it was excluded at: "x:<id>:<expiry>". */
export const exclusionId = (recordId: string, expiry: string | null | undefined): string => `x:${recordId}:${expiry ?? ''}`;

/** A free line's id: "free:<uuid>". Math.random, not crypto: this must work on plain-http field connections too (and a collision just no-ops the second add). */
export function freeLineId(): string {
  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return `free:${hex}`;
}

function parseExclusion(recordId: string): { id: string; expiry: string } | null {
  if (!recordId.startsWith('x:')) return null;
  const rest = recordId.slice(2);
  const at = rest.indexOf(':');
  if (at < 0) return null;
  return { id: rest.slice(0, at), expiry: rest.slice(at + 1) };
}

/** The record ids currently shut out by exclusions (parsed from "x:<id>:<expiry>"). */
export function excludedRecordIds(excluded: OrderListEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const e of excluded) {
    const p = parseExclusion(e.record_id);
    if (p) ids.add(p.id);
  }
  return ids;
}

/** Record ids already on the basket as automatic or manual lines (free-line ids never collide with record ids). */
export function coveredRecordIds(basket: Basket): Set<string> {
  return new Set(basket.lines.filter(l => l.origin !== 'free').map(l => l.record_id));
}

const entryOf = (r: PPERecord): OrderListEntry => ({
  record_id: String(r.id), employee_id: r.employee_id, employee_name: r.employee_name,
  ppe_type: r.ppe_type, item_name: r.item_name, size: r.size, expiry_date: r.expiry_date,
});

/** A line's ordering section: a person's current register section, else the section saved on their PPE record
 *  (people off the register), else what a free line was added with; 'Unassigned' when none of these is known. */
function sectionOf(line: OrderListEntry, register: BasketRegister, recordSections: Map<string, string>): string {
  const fromRegister = line.employee_id ? register.sections?.get(normalizeEmployeeId(line.employee_id)) : undefined;
  return normalizeSection(fromRegister || recordSections.get(line.record_id) || line.section);
}

export function buildBasket(records: PPERecord[], stored: OrderListEntry[], register: BasketRegister, todayISO: string): Basket {
  const recordSections = new Map(records.filter(r => r.mine_section).map(r => [String(r.id), r.mine_section]));
  const withSection = <T extends OrderListEntry>(line: T): T => ({ ...line, section: sectionOf(line, register, recordSections) });
  const excluded = stored.filter(e => e.kind === 'excluded');
  const shutOut = new Set(excluded.map(e => e.record_id));
  // An exclusion holds only while the record still carries the expiry it was excluded at: a renewal breaks the pair and the line returns.
  const auto = dueNow(records, register, todayISO).filter(r => !shutOut.has(exclusionId(String(r.id), r.expiry_date)));
  const autoIds = new Set(auto.map(r => String(r.id)));
  const allManual = stored.filter(e => (e.kind ?? 'line') === 'line');
  // A flagged line is for the item its record holds now; once that item has been renewed (a new expiry, not due soon),
  // the line was fulfilled outside the list and must not be ordered again.
  const recordsById = new Map(records.map(r => [String(r.id), r]));
  const horizonDate = new Date(`${todayISO}T12:00:00`);
  horizonDate.setDate(horizonDate.getDate() + EARLY_ORDER_DAYS);
  const horizon = toISODate(horizonDate);
  const day = (d?: string | null) => (d ? d.slice(0, 10) : null);
  const renewedSince = (e: OrderListEntry) => {
    const current = day(recordsById.get(e.record_id)?.expiry_date);
    return !autoIds.has(e.record_id) && current !== null && current !== day(e.expiry_date) && current > horizon;
  };
  const renewed = allManual.filter(renewedSince);
  const renewedIds = new Set(renewed.map(e => e.record_id));
  const manual = allManual.filter(e => !renewedIds.has(e.record_id));
  const twins = manual.filter(e => autoIds.has(e.record_id));
  const twinIds = new Set(twins.map(e => e.record_id));
  // Legacy (kind-less) lines outside the automatic set — kept or removed from the banner. Records that are gone, back in date, or
  // off the register all land here: the action is the same either way.
  const notDueLegacy = manual.filter(e => e.kind === undefined && !autoIds.has(e.record_id));
  const free = stored.filter(e => e.kind === 'free');
  const lines: BasketLine[] = [
    ...auto.map(r => ({ ...entryOf(r), kind: 'line' as const, qty: 1, origin: 'auto' as const })),
    // A kept line shows its item's current expiry when it stored none (lines moved off one browser's list carried none).
    ...manual.filter(e => !twinIds.has(e.record_id)).map(e => ({ ...e, expiry_date: e.expiry_date ?? recordsById.get(e.record_id)?.expiry_date ?? null, kind: 'line' as const, qty: e.qty ?? 1, origin: 'manual' as const })),
    ...free.map(e => ({ ...e, qty: e.qty ?? 1, origin: 'free' as const })),
  ].map(withSection);
  const manualCount = lines.filter(l => l.origin === 'manual').length;
  return { lines, counts: { auto: auto.length, manual: manualCount, free: free.length, excluded: excluded.length }, excluded, twins, notDueLegacy, renewed };
}

/** The Monday–Sunday week `offset` weeks after the one containing `dateISO` (0 = this week). ISO strings in and out. */
export function weekWindow(dateISO: string, offset: number): { from: string; to: string } {
  const monday = mondayOf(new Date(`${dateISO}T12:00:00`));
  monday.setDate(monday.getDate() + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}

/** Records an "add" entry point may offer: active, on the register, not archived, expiring within [from, to], neither covered nor excluded. Oldest expiry first. */
export function addableInWindow(records: PPERecord[], register: BasketRegister, coveredIds: Set<string>, excludedIds: Set<string>, from: string, to: string): PPERecord[] {
  return records.filter(r =>
    r.status === 'active'
    && !!r.expiry_date && r.expiry_date >= from && r.expiry_date <= to
    && register.known.has(normalizeEmployeeId(r.employee_id))
    && !register.archived.has(normalizeEmployeeId(r.employee_id))
    && !coveredIds.has(String(r.id))
    && !excludedIds.has(String(r.id)),
  ).sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''));
}

/** Records the "choose from due soon" dialog may offer: addable within [today, today+30]. */
export function addableSoon(records: PPERecord[], register: BasketRegister, coveredIds: Set<string>, excludedIds: Set<string>, todayISO: string): PPERecord[] {
  const end = new Date(`${todayISO}T12:00:00`);
  end.setDate(end.getDate() + 30);
  return addableInWindow(records, register, coveredIds, excludedIds, todayISO, toISODate(end));
}
