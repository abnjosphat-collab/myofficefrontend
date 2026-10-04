// app/timesheets/useTimesheetEditing.ts — everything that writes timesheet rows: one day, many days (with an Undo that restores exactly what
// was there), clearing days, the quick add and remove on a cell, filling across days, and copying the previous period. Moved here from the
// page with its behaviour unchanged, except that copying the previous period now says how many existing entries it will replace.
'use client';

import { toast } from 'sonner';
import type { ConfirmFn } from '@/components/ui-system';
import { applyNormalHoursFill, applyOffFill, buildDefaultEntry, canFillFromSource, extractFillFromSource, isFillProtectedTarget } from './fillEntry';
import { fmtDate, getDays, getNECPeriod, getSalariedPeriod } from './timesheetMeta';
import { resolveFillTargetEntry, timesheetWritePayload } from './timesheetWritePayload';
import type { Employee, TimesheetEntry } from './types';
import { api } from './useTimesheetsData';

type Entry = Omit<TimesheetEntry, 'id'>;
const key = (e: { employee_id: number | string; date: string }) => `${e.employee_id}:${e.date}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const withoutId = (e: TimesheetEntry): Entry => { const copy = { ...e }; delete copy.id; return copy; };

/** The entries copying from the previous period would write, matched day by day from the start of each period. */
export function previousPeriodEntries(args: { previous: TimesheetEntry[]; employees: Employee[]; currentDays: Date[]; previousDays: Date[] }): Entry[] {
  const { previous, employees, currentDays, previousDays } = args;
  const out: Entry[] = [];
  employees.forEach(emp => currentDays.forEach((curDay, idx) => {
    if (idx >= previousDays.length) return;
    const prev = previous.find(ts => String(ts.employee_id) === String(emp.id) && ts.date === fmtDate(previousDays[idx]));
    if (prev) out.push({ ...prev, employee_id: parseInt(emp.id), date: fmtDate(curDay), id: undefined } as Entry);
  }));
  return out;
}

export function useTimesheetEditing({ timesheets, setTimesheets, effectiveTimesheets, tabEmployees, activeTab, currentMonth, activePeriod, confirm }: {
  timesheets: TimesheetEntry[]; setTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>; effectiveTimesheets: TimesheetEntry[]; tabEmployees: Employee[];
  activeTab: 'salaried' | 'nec'; currentMonth: Date; activePeriod: { start: Date; end: Date }; confirm: ConfirmFn;
}) {
  const saveEntry = async (empId: string, date: Date, data: Entry) => {
    const ds = fmtDate(date);
    const payload = timesheetWritePayload(data);
    const existing = timesheets.find(ts => String(ts.employee_id) === String(empId) && ts.date === ds);
    if (existing?.id) {
      const updated = await api.update(existing.id, payload);
      setTimesheets(prev => prev.map(ts => (ts.id === existing.id ? { ...ts, ...updated } : ts)));
    } else {
      const created = await api.create(payload);
      setTimesheets(prev => [...prev, created]);
    }
  };

  const deleteEntry = async (entryId: number) => {
    await api.delete(entryId);
    setTimesheets(prev => prev.filter(ts => ts.id !== entryId));
  };

  /** Reverts one bulk write: restores each touched row to what it was (or deletes it, if it did not exist). Built when the write happened,
   *  not read from live state, so it stays right however many renders pass before Undo is clicked. */
  const undoBulk = async (plan: { id: number; previous: TimesheetEntry | null }[]) => {
    try {
      const results = await Promise.allSettled(plan.map(({ id, previous }) => {
        if (previous) return api.update(id, withoutId(previous));
        return api.delete(id);
      }));
      setTimesheets(prev => {
        const map = new Map(prev.map(ts => [ts.id, ts]));
        results.forEach((r, i) => {
          const { id, previous } = plan[i];
          if (r.status !== 'fulfilled') return;
          if (previous) map.set(id, (r.value as TimesheetEntry) ?? previous); else map.delete(id);
        });
        return [...map.values()];
      });
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) toast.warning(`${failed} ${plural(failed, 'change', 'changes')} could not be undone.`); else toast.success('Undone.');
    } catch (e) { toast.error(`Undo failed: ${(e as Error).message}`); }
  };

  const bulkSave = async (entries: Entry[], opts?: { quiet?: boolean }) => {
    const previousByKey = new Map<string, TimesheetEntry | null>();
    entries.forEach(entry => { previousByKey.set(key(entry), timesheets.find(ts => String(ts.employee_id) === String(entry.employee_id) && ts.date === entry.date) ?? null); });

    // Optimistic: the grid shows the new rows at once, and each failure is put back below.
    setTimesheets(prev => {
      const map = new Map(prev.map(ts => [key(ts), ts]));
      entries.forEach(entry => { map.set(key(entry), { ...entry, id: map.get(key(entry))?.id } as TimesheetEntry); });
      return [...map.values()];
    });

    const results = await Promise.allSettled(entries.map(async entry => {
      const existing = previousByKey.get(key(entry));
      const payload = timesheetWritePayload(entry);
      return existing?.id ? api.update(existing.id, payload) : api.create(payload);
    }));
    const saved = results.filter((r): r is PromiseFulfilledResult<TimesheetEntry> => r.status === 'fulfilled').map(r => r.value);
    const failedIdx = results.map((r, i) => (r.status === 'rejected' ? i : -1)).filter(i => i >= 0);

    setTimesheets(prev => {
      const map = new Map(prev.map(ts => [key(ts), ts]));
      saved.forEach(s => map.set(key(s), s));
      failedIdx.forEach(i => { const k = key(entries[i]); const previous = previousByKey.get(k); if (previous) map.set(k, previous); else map.delete(k); });
      return [...map.values()];
    });

    if (failedIdx.length > 0) {
      const first = results[failedIdx[0]] as PromiseRejectedResult;
      toast.warning(`${failedIdx.length} ${plural(failedIdx.length, 'entry', 'entries')} failed to save: ${(first.reason as Error)?.message ?? 'no reason given'}`);
    }
    if (saved.length > 0) {
      const plan = saved.filter(s => s.id != null).map(s => ({ id: s.id!, previous: previousByKey.get(key(s)) ?? null }));
      const label = opts?.quiet ? `Filled ${saved.length} ${plural(saved.length, 'day', 'days')}` : `Saved ${saved.length} ${plural(saved.length, 'entry', 'entries')}`;
      toast.success(label, { action: { label: 'Undo', onClick: () => { void undoBulk(plan); } } });
    }
  };

  const undoBulkClear = async (entries: TimesheetEntry[]) => {
    try {
      const results = await Promise.allSettled(entries.map(e => api.create(withoutId(e))));
      const restored = results.filter((r): r is PromiseFulfilledResult<TimesheetEntry> => r.status === 'fulfilled').map(r => r.value);
      setTimesheets(prev => { const map = new Map(prev.map(ts => [key(ts), ts])); restored.forEach(r => map.set(key(r), r)); return [...map.values()]; });
      const failed = results.length - restored.length;
      if (failed > 0) toast.warning(`${failed} ${plural(failed, 'entry', 'entries')} could not be restored.`); else toast.success('Restored.');
    } catch (e) { toast.error(`Undo failed: ${(e as Error).message}`); }
  };

  /** Deletes real entries across a (person x date) selection. Targets with no entry are skipped (nothing to clear); a derived, unsaved
   *  entry has no row to delete. Undo re-creates whatever was actually deleted. */
  const bulkClear = async (targets: { employee_id: number; date: string }[]) => {
    const toDelete = targets.map(({ employee_id, date }) => timesheets.find(ts => String(ts.employee_id) === String(employee_id) && ts.date === date)).filter((ts): ts is TimesheetEntry => !!ts?.id);
    if (toDelete.length === 0) { toast.info('Nothing to clear in the selected days.'); return; }
    const results = await Promise.allSettled(toDelete.map(ts => api.delete(ts.id!)));
    const cleared = toDelete.filter((_, i) => results[i].status === 'fulfilled');
    const ids = new Set(cleared.map(ts => ts.id));
    setTimesheets(prev => prev.filter(ts => !ids.has(ts.id)));
    const failed = results.length - cleared.length;
    if (failed > 0) {
      const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      toast.warning(`${failed} ${plural(failed, 'entry', 'entries')} failed to clear: ${(first?.reason as Error)?.message ?? 'no reason given'}`);
    }
    if (cleared.length > 0) toast.success(`Cleared ${cleared.length} ${plural(cleared.length, 'day', 'days')}`, { action: { label: 'Undo', onClick: () => { void undoBulkClear(cleared); } } });
  };

  /** The cell's quick "+": one day with the role's normal hours (a paid holiday where it is one, a worked 2.0× day on a weekend). */
  const quickAdd = async (emp: Employee, day: Date) => { await bulkSave([buildDefaultEntry(emp, day)]); };
  const quickRemove = async (emp: Employee, entry: TimesheetEntry) => { await bulkClear([{ employee_id: parseInt(emp.id), date: entry.date }]); };

  /** Excel-style fill across days: copies normal hours and shift times (or Off) only; overtime and allowances stay on each target, and leave days are protected. */
  const fillDays = async (emp: Employee, sourceDay: Date, targetDays: Date[], sourceEntry?: TimesheetEntry) => {
    if (targetDays.length === 0) return;
    if (sourceEntry && !canFillFromSource(sourceEntry)) { toast.info('Fill uses normal work hours only: pick a work day (not leave or 2.0×).'); return; }
    const empId = parseInt(emp.id);
    const fillFrom = sourceEntry ? extractFillFromSource(sourceEntry) : extractFillFromSource(buildDefaultEntry(emp, sourceDay) as TimesheetEntry);
    const entries: Entry[] = [];
    let skipped = 0;
    for (const day of targetDays) {
      const dateStr = fmtDate(day);
      const existing = resolveFillTargetEntry(emp.id, dateStr, timesheets, effectiveTimesheets);
      if (isFillProtectedTarget(existing)) { skipped += 1; continue; }
      if (fillFrom.kind === 'off') entries.push(timesheetWritePayload(applyOffFill(fillFrom.status, existing, empId, dateStr)));
      else entries.push(timesheetWritePayload(applyNormalHoursFill(fillFrom.normal, existing, empId, dateStr, fillFrom.kind === 'normal' ? fillFrom.nightAllowance : undefined)));
    }
    if (entries.length === 0) { toast.info(skipped > 0 ? `No cells filled: ${skipped} protected leave ${plural(skipped, 'day', 'days')} skipped.` : 'Nothing to fill.'); return; }
    await bulkSave(entries, { quiet: true });
    if (skipped > 0) toast.info(`Skipped ${skipped} leave ${plural(skipped, 'day', 'days')} (owned by the Leaves module).`);
  };

  const copyPrevious = async () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevPeriod = activeTab === 'salaried' ? getSalariedPeriod(prevMonth) : getNECPeriod(prevMonth);
    try {
      const previous = await api.timesheets(fmtDate(prevPeriod.start), fmtDate(prevPeriod.end));
      const entries = previousPeriodEntries({ previous, employees: tabEmployees, currentDays: getDays(activePeriod), previousDays: getDays(prevPeriod) });
      if (entries.length === 0) { toast.info('No entries found in the previous period.'); return; }
      const replacing = entries.filter(e => timesheets.some(ts => String(ts.employee_id) === String(e.employee_id) && ts.date === e.date)).length;
      if (replacing > 0 && !await confirm({ title: 'Copy the previous period over this one?', message: `${entries.length} ${plural(entries.length, 'entry', 'entries')} are copied, ${replacing} of them replacing what is already entered here.`, confirmLabel: 'Copy', destructive: true })) return;
      await bulkSave(entries);
    } catch (e) { toast.error(`Copy failed: ${(e as Error).message}`); }
  };

  return { saveEntry, deleteEntry, bulkSave, bulkClear, quickAdd, quickRemove, fillDays, copyPrevious };
}
