// app/maintenance/SchedulesView.tsx — the recurring schedules as cards: what repeats and how often, who does it, when it is next due.
// Each can be raised now (one work order per machine), paused or resumed, edited or deleted. Pausing is optimistic and reverts with the
// reason if the server refuses; raising now reports each machine that failed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, DataRegion, EmptyState, IconButton, RecordCard, SearchField, StatusBadge, deriveDataStatus, isTransientStatus } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import type { ApiListState } from '@/lib/useApiList';
import { createWorkOrder, deleteSchedule, updateSchedule } from './api';
import { blankWorkOrderBody, machinesOf, nextWONumber, recurrenceLabel } from './helpers';
import type { MaintenanceSchedule, WorkOrder } from './types';
import { useConfirmDelete } from '@/lib/useConfirmDelete';

export function SchedulesView({ list, orders, onEdit, onNew, onRaised }: { list: ApiListState<MaintenanceSchedule>; orders: WorkOrder[]; onEdit: (s: MaintenanceSchedule) => void; onNew: () => void; onRaised: () => void }) {
  const confirmDelete = useConfirmDelete();
  const [search, setSearch] = useState('');
  const [raising, setRaising] = useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => list.items.filter(s => !q || [s.name, s.equipment_info, s.allocated_to].some(v => (v || '').toLowerCase().includes(q))), [list.items, q]);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: rows.length, transient: isTransientStatus(list.errorStatus) });

  const toggle = async (s: MaintenanceSchedule) => {
    const next = !s.active;
    list.setItems(prev => prev.map(x => (x.id === s.id ? { ...x, active: next } : x)));
    try { await updateSchedule(s.id, { active: next }); }
    catch (e) { list.setItems(prev => prev.map(x => (x.id === s.id ? { ...x, active: !next } : x))); toast.error(`${s.name} was not ${next ? 'resumed' : 'paused'}: ${(e as Error).message}`); }
  };
  const remove = async (s: MaintenanceSchedule) => {
    await confirmDelete({ title: 'Delete this schedule?', message: `${s.name}. Work orders already raised from it stay. This cannot be undone.`, what: `${s.name}`, run: async () => { await deleteSchedule(s.id); }, done: 'Schedule deleted.', after: () => list.refetch() });
  };
  const raiseNow = async (s: MaintenanceSchedule) => {
    const machines = machinesOf(s.equipment_info);
    if (machines.length === 0) { toast.error(`${s.name} has no machines to raise work orders for.`); return; }
    setRaising(s.id);
    const failed: { machine: string; reason: string }[] = [];
    let raised = 0;
    for (const machine of machines) {
      try {
        await createWorkOrder({
          ...blankWorkOrderBody(), work_order_number: nextWONumber(orders, raised), equipment_info: machine, to_department: s.to_department, allocated_to: s.allocated_to, authorising_foreman: s.authorising_foreman,
          responsible_foreman: s.authorising_foreman, estimated_hours: s.estimated_hours, job_request_details: s.job_request_details, job_instructions: s.job_instructions, priority: s.priority,
          date_raised: todayLocal(), requested_by: `From schedule: ${s.name}`, artisan_name: s.allocated_to,
        });
        raised += 1;
      } catch (e) { failed.push({ machine, reason: e instanceof Error ? e.message : 'Not saved.' }); }
    }
    setRaising(null);
    if (raised) { toast.success(raised > 1 ? `${raised} work orders raised from ${s.name}.` : `Work order raised from ${s.name}.`); onRaised(); }
    if (failed.length) toast.error(`Could not raise for ${failed.map(f => `${f.machine} (${f.reason})`).join(', ')}.`);
  };

  return (
    <div className="flex flex-col gap-4">
      <SearchField value={search} onValueChange={setSearch} placeholder="Search schedules" wrapperClassName="w-full max-w-md" />
      <DataRegion
        status={status} subject="schedules" error={list.error} onRetry={() => list.refetch()}
        empty={q
          ? <EmptyState icon="search" title="No schedules match" description="Try a different search." action={<Button onClick={() => setSearch('')}>Clear search</Button>} />
          : <EmptyState icon="clock" title="No recurring schedules yet" description="A schedule raises work orders for you every week, month, quarter or on set dates." action={<Button variant="primary" icon="plus" onClick={onNew}>Create the first schedule</Button>} />}
      >
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Schedules">
          {rows.map(s => (
            <li key={s.id} className="relative">
              <RecordCard
                eyebrow={recurrenceLabel(s)} title={s.name} subtitle={s.equipment_info} openLabel={`Edit the schedule ${s.name}`} onOpen={() => onEdit(s)}
                status={<StatusBadge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Paused'}</StatusBadge>}
                facts={[{ label: 'Next due', value: <span className="tabular">{s.next_due_date ? fmtDate(s.next_due_date) : 'No date'}</span> }, ...(s.allocated_to ? [{ label: 'Allocated to', value: s.allocated_to }] : []), ...(s.to_department ? [{ label: 'Department', value: s.to_department }] : [])]}
                action={(
                  <span className="inline-flex flex-wrap items-center gap-1">
                    <Button size="sm" pending={raising === s.id} onClick={() => raiseNow(s)}>Raise now</Button>
                    <Button size="sm" variant="ghost" onClick={() => toggle(s)}>{s.active ? 'Pause' : 'Resume'}</Button>
                    <IconButton icon="delete" size="sm" variant="ghost" label={`Delete the schedule ${s.name}`} onClick={() => remove(s)} />
                  </span>
                )}
              />
            </li>
          ))}
        </ul>
      </DataRegion>
    </div>
  );
}
