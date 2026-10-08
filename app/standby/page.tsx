// app/standby/page.tsx — the standby module: who stands standby each week (with
// crew and tap-to-call/WhatsApp contact), the rotation sequences, and the duty
// officials. Rotations and duty entries are managed here; the 4-week shift cycles
// stay on the Shifts page.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Notice, PageHeader, StatusBadge,
  Tabs, TabsContent, TabsList, TabsTrigger, deriveDataStatus, isTransientStatus, useConfirm, type Column,
} from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import { DutyDialog } from './DutyDialog';
import { RotationDialog } from './RotationDialog';
import { WeekBoard } from './WeekBoard';
import { addDays } from './standbyRoster';
import type { DutyEntry, StandbyRotation } from './types';
import {
  createDutyEntry, createRotation, deleteDutyEntry, deleteRotation,
  updateDutyEntry, updateRotation, useDutyRoster, useRotations,
} from './useStandbyData';

function StandbyContent() {
  const confirm = useConfirm();
  const rotations = useRotations();
  const duty = useDutyRoster();
  const employees = useEmployees();
  const [tab, setTab] = useState('week');
  const [anchor, setAnchor] = useState(() => todayLocal());
  const [rotationOpen, setRotationOpen] = useState(false);
  const [editingRotation, setEditingRotation] = useState<StandbyRotation | null>(null);
  const [dutyOpen, setDutyOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<DutyEntry | null>(null);

  const rotationsStatus = deriveDataStatus({ loaded: rotations.loaded, loading: rotations.loading, error: rotations.error, errorStatus: rotations.errorStatus, count: rotations.items.length, transient: isTransientStatus(rotations.errorStatus) });
  const dutyStatus = deriveDataStatus({ loaded: duty.loaded, loading: duty.loading, error: duty.error, errorStatus: duty.errorStatus, count: duty.items.length, transient: isTransientStatus(duty.errorStatus) });
  const refresh = () => { void rotations.refetch(); void duty.refetch(); };

  const saveRotation = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createRotation(payload as Parameters<typeof createRotation>[0]);
      else await updateRotation(id, payload);
    } catch (e) { throw new Error(`The rotation was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Rotation created.' : 'Rotation updated.');
    await rotations.refetch();
  };
  const saveDuty = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createDutyEntry(payload as Parameters<typeof createDutyEntry>[0]);
      else await updateDutyEntry(id, payload);
    } catch (e) { throw new Error(`The duty official was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Duty official named.' : 'Duty official updated.');
    await duty.refetch();
  };
  const removeRotation = async (r: StandbyRotation) => {
    if (!await confirm({ title: `Delete the ${r.name} rotation?`, message: 'Its member sequence and crew are removed. This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteRotation(r.id); toast.success('Rotation deleted.'); await rotations.refetch(); }
    catch (e) { toast.error(`The rotation was not deleted: ${(e as Error).message}`); }
  };
  const removeDuty = async (e: DutyEntry) => {
    if (!await confirm({ title: `Remove ${e.employee_name} as duty official?`, message: `${fmtDate(e.date_from.slice(0, 10))} to ${fmtDate(e.date_to.slice(0, 10))}. This cannot be undone.`, confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteDutyEntry(e.id); toast.success('Duty official removed.'); await duty.refetch(); }
    catch (e) { toast.error(`The duty official was not removed: ${(e as Error).message}`); }
  };

  const ROTATION_COLUMNS: Column<StandbyRotation>[] = [
    { id: 'name', header: 'Rotation', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</p><p className="text-caption text-ink-muted">{r.section || 'No section'}</p></div> },
    { id: 'seq', header: 'Sequence', cell: r => <span className="text-ink-muted">{r.members.length === 0 ? 'No members yet' : r.members.map(m => m.employee_name).join(' → ')}</span> },
    { id: 'stint', header: 'Stint', hideBelow: 'md', cell: r => <span className="whitespace-nowrap tabular">{r.week_length_days}d from {fmtDate(r.cycle_start_date.slice(0, 10))}</span> },
    { id: 'status', header: 'Status', hideBelow: 'md', cell: r => <StatusBadge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</StatusBadge> },
  ];
  const DUTY_COLUMNS: Column<DutyEntry>[] = [
    { id: 'name', header: 'Official', sticky: true, cell: e => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{e.employee_name}</p><p className="font-mono text-caption text-ink-muted">{e.employee_id}</p></div> },
    { id: 'scope', header: 'Scope', cell: e => <StatusBadge tone={e.department ? 'brand' : 'neutral'}>{e.department || 'Mine-wide'}</StatusBadge> },
    { id: 'dates', header: 'Dates', hideBelow: 'md', cell: e => <span className="whitespace-nowrap tabular">{fmtDate(e.date_from.slice(0, 10))} to {fmtDate(e.date_to.slice(0, 10))}</span> },
    { id: 'contact', header: 'Contact', hideBelow: 'lg', cell: e => <ContactButtons phone={e.phone} name={e.employee_name} /> },
  ];

  const weekLabel = `${fmtDate(anchor)} to ${fmtDate(addDays(anchor, 6))}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Standby' }]}
        title="Standby"
        description="Who stands standby each week, and who answers as duty official."
        actions={<IconButton icon="refresh" label="Refresh standby" variant="ghost" pending={(rotations.loading && rotations.loaded) || (duty.loading && duty.loaded)} onClick={refresh} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Standby views">
          <TabsTrigger value="week" icon="calendar">This week</TabsTrigger>
          <TabsTrigger value="rotations" icon="sync">Rotations</TabsTrigger>
          <TabsTrigger value="duty" icon="shield">Duty officials</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon="chevron-left" label="Previous week" variant="outline" onClick={() => setAnchor(a => addDays(a, -7))} />
            <span className="min-w-52 text-center font-sans text-label font-medium tabular text-ink" aria-live="polite">{weekLabel}</span>
            <IconButton icon="chevron-right" label="Next week" variant="outline" onClick={() => setAnchor(a => addDays(a, 7))} />
            {anchor !== todayLocal() && <Button onClick={() => setAnchor(todayLocal())}>This week</Button>}
          </div>
          {duty.error && <Notice tone="warning" title="Duty officials could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => duty.refetch()}>Try again</Button>}>{duty.error} The week below shows standby only.</Notice>}
          <DataRegion status={rotationsStatus} subject="standby rotations" error={rotations.error} onRetry={() => rotations.refetch()} empty={<EmptyState icon="clock" title="No standby rotations yet" description="Create a rotation to see who stands standby each week." />}>
            <WeekBoard rotations={rotations.items} duty={duty.items} employees={employees} anchor={anchor} />
          </DataRegion>
        </TabsContent>

        <TabsContent value="rotations" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="primary" icon="plus" onClick={() => { setEditingRotation(null); setRotationOpen(true); }}>New rotation</Button>
          </div>
          <DataRegion status={rotationsStatus} subject="standby rotations" error={rotations.error} onRetry={() => rotations.refetch()} empty={<EmptyState icon="sync" title="No standby rotations yet" description="Create one to set up who stands standby and in what order." />}>
            <DataTable caption="Standby rotations" rows={rotations.items} columns={ROTATION_COLUMNS} getRowId={r => String(r.id)}
              rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { setEditingRotation(r); setRotationOpen(true); }}>Edit</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Delete the ${r.name} rotation`} onClick={() => removeRotation(r)} /></span>} />
          </DataRegion>
        </TabsContent>

        <TabsContent value="duty" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="primary" icon="plus" onClick={() => { setEditingDuty(null); setDutyOpen(true); }}>Name official</Button>
          </div>
          <DataRegion status={dutyStatus} subject="duty officials" error={duty.error} onRetry={() => duty.refetch()} empty={<EmptyState icon="shield" title="No duty officials named" description="Name who answers for the mine, and for which dates." />}>
            <DataTable caption="Duty officials" rows={duty.items} columns={DUTY_COLUMNS} getRowId={r => String(r.id)}
              rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { setEditingDuty(r); setDutyOpen(true); }}>Edit</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Remove ${r.employee_name} as duty official`} onClick={() => removeDuty(r)} /></span>} />
          </DataRegion>
        </TabsContent>
      </Tabs>

      <RotationDialog open={rotationOpen} rotation={editingRotation} onOpenChange={setRotationOpen} onSave={saveRotation} />
      <DutyDialog open={dutyOpen} entry={editingDuty} onOpenChange={setDutyOpen} onSave={saveDuty} />
    </div>
  );
}

export default function StandbyPage() {
  return <AppShell migrated><StandbyContent /></AppShell>;
}
