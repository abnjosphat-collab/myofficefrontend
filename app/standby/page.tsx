// app/standby/page.tsx — the standby module: who stands standby each week (with
// crew and tap-to-call/WhatsApp contact), the rotation sequences until each
// cycle restarts, covers holding in place of absent members, and the duty
// officials. Rotations, overrides, and covers are managed here; the 4-week
// shift cycles stay on the Shifts page.
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
import { useApiList } from '@/lib/useApiList';
import { todayLocal } from '@/lib/dates';
import type { LeaveRecord } from '@/app/shifts/types';
import { CoverDialog } from './CoverDialog';
import { DutyDialog } from './DutyDialog';
import { MonthBoard } from './MonthBoard';
import { RotationDialog } from './RotationDialog';
import { WeekBoard } from './WeekBoard';
import { addDays, resolvePhone } from './standbyRoster';
import type { CoverPreset, DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';
import {
  createCover, createDutyEntry, createDutyRotation, createRotation,
  deleteCover, deleteDutyEntry, deleteDutyRotation, deleteRotation,
  updateCover, updateDutyEntry, updateDutyRotation, updateRotation,
  useCovers, useDutyRoster, useDutyRotations, useRotations,
} from './useStandbyData';

function StandbyContent() {
  const confirm = useConfirm();
  const rotations = useRotations();
  const dutyRotations = useDutyRotations();
  const duty = useDutyRoster();
  const covers = useCovers();
  const leaves = useApiList<LeaveRecord>('/api/leaves');
  const employees = useEmployees();
  const [tab, setTab] = useState('week');
  const [anchor, setAnchor] = useState(() => todayLocal());
  const [rotationOpen, setRotationOpen] = useState(false);
  const [editingRotation, setEditingRotation] = useState<StandbyRotation | null>(null);
  const [dutyRotationOpen, setDutyRotationOpen] = useState(false);
  const [editingDutyRotation, setEditingDutyRotation] = useState<DutyRotation | null>(null);
  const [dutyOpen, setDutyOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<DutyEntry | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [editingCover, setEditingCover] = useState<RotationCover | null>(null);
  const [coverPreset, setCoverPreset] = useState<CoverPreset | null>(null);

  const weekCount = rotations.items.length + dutyRotations.items.length + duty.items.length;
  const weekStatus = deriveDataStatus({
    loaded: rotations.loaded && dutyRotations.loaded && duty.loaded && covers.loaded,
    loading: rotations.loading || dutyRotations.loading || duty.loading || covers.loading,
    error: rotations.error, errorStatus: rotations.errorStatus, count: weekCount,
    transient: isTransientStatus(rotations.errorStatus),
  });
  const rotationsStatus = deriveDataStatus({ loaded: rotations.loaded, loading: rotations.loading, error: rotations.error, errorStatus: rotations.errorStatus, count: rotations.items.length, transient: isTransientStatus(rotations.errorStatus) });
  const dutyRotationsStatus = deriveDataStatus({ loaded: dutyRotations.loaded, loading: dutyRotations.loading, error: dutyRotations.error, errorStatus: dutyRotations.errorStatus, count: dutyRotations.items.length, transient: isTransientStatus(dutyRotations.errorStatus) });
  const dutyStatus = deriveDataStatus({ loaded: duty.loaded, loading: duty.loading, error: duty.error, errorStatus: duty.errorStatus, count: duty.items.length, transient: isTransientStatus(duty.errorStatus) });
  const coversStatus = deriveDataStatus({ loaded: covers.loaded, loading: covers.loading, error: covers.error, errorStatus: covers.errorStatus, count: covers.items.length, transient: isTransientStatus(covers.errorStatus) });
  const refresh = () => { void rotations.refetch(); void dutyRotations.refetch(); void duty.refetch(); void covers.refetch(); void leaves.refetch(); };

  const saveRotation = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createRotation(payload as Parameters<typeof createRotation>[0]);
      else await updateRotation(id, payload);
    } catch (e) { throw new Error(`The rotation was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Rotation created.' : 'Rotation updated.');
    await rotations.refetch();
  };
  const saveDutyRotation = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createDutyRotation(payload as Parameters<typeof createDutyRotation>[0]);
      else await updateDutyRotation(id, payload);
    } catch (e) { throw new Error(`The duty roster was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Duty roster created.' : 'Duty roster updated.');
    await dutyRotations.refetch();
  };
  const saveDuty = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createDutyEntry(payload as Parameters<typeof createDutyEntry>[0]);
      else await updateDutyEntry(id, payload);
    } catch (e) { throw new Error(`The duty official was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Duty official named.' : 'Duty official updated.');
    await duty.refetch();
  };
  const saveCover = async (id: number | null, payload: Record<string, unknown>) => {
    try {
      if (id === null) await createCover(payload as Parameters<typeof createCover>[0]);
      else await updateCover(id, payload);
    } catch (e) { throw new Error(`The cover was not saved: ${(e as Error).message}`); }
    toast.success(id === null ? 'Cover named.' : 'Cover updated.');
    await covers.refetch();
  };
  const removeRotation = async (r: StandbyRotation) => {
    if (!await confirm({ title: `Delete the ${r.name} rotation?`, message: 'Its member sequence and crew are removed. This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteRotation(r.id); toast.success('Rotation deleted.'); await rotations.refetch(); }
    catch (e) { toast.error(`The rotation was not deleted: ${(e as Error).message}`); }
  };
  const removeDutyRotation = async (r: DutyRotation) => {
    if (!await confirm({ title: `Delete the ${r.name} duty roster?`, message: 'Its official sequence is removed. Explicitly named officials stay. This cannot be undone.', confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteDutyRotation(r.id); toast.success('Duty roster deleted.'); await dutyRotations.refetch(); }
    catch (e) { toast.error(`The duty roster was not deleted: ${(e as Error).message}`); }
  };
  const removeDuty = async (e: DutyEntry) => {
    if (!await confirm({ title: `Remove ${e.employee_name} as duty official?`, message: `${fmtDate(e.date_from.slice(0, 10))} to ${fmtDate(e.date_to.slice(0, 10))}. This cannot be undone.`, confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteDutyEntry(e.id); toast.success('Duty official removed.'); await duty.refetch(); }
    catch (e) { toast.error(`The duty official was not removed: ${(e as Error).message}`); }
  };
  const removeCover = async (c: RotationCover) => {
    if (!await confirm({ title: `Remove ${c.cover_employee_name}'s cover?`, message: `${c.absent_employee_name} holds again over ${fmtDate(c.date_from.slice(0, 10))} to ${fmtDate(c.date_to.slice(0, 10))}. This cannot be undone.`, confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteCover(c.id); toast.success('Cover removed.'); await covers.refetch(); }
    catch (e) { toast.error(`The cover was not removed: ${(e as Error).message}`); }
  };
  const nameCover = (preset: CoverPreset) => {
    setEditingCover(null);
    setCoverPreset(preset);
    setCoverOpen(true);
  };

  const ROTATION_COLUMNS: Column<StandbyRotation>[] = [
    { id: 'name', header: 'Rotation', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</p><p className="text-caption text-ink-muted">{r.section || 'No section'}</p></div> },
    { id: 'seq', header: 'Sequence', cell: r => <span className="text-ink-muted">{r.members.length === 0 ? 'No members yet' : r.members.map(m => m.employee_name).join(' → ')}</span> },
    { id: 'stint', header: 'Stint', hideBelow: 'md', cell: r => <span className="whitespace-nowrap tabular">{r.week_length_days}d from {fmtDate(r.cycle_start_date.slice(0, 10))}</span> },
    { id: 'status', header: 'Status', hideBelow: 'md', cell: r => <StatusBadge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</StatusBadge> },
  ];
  const DUTY_ROTATION_COLUMNS: Column<DutyRotation>[] = [
    { id: 'name', header: 'Roster', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</p><p className="text-caption text-ink-muted">{r.department || 'Mine-wide'}</p></div> },
    { id: 'seq', header: 'Sequence', cell: r => <span className="text-ink-muted">{r.members.length === 0 ? 'No officials yet' : r.members.map(m => m.employee_name).join(' → ')}</span> },
    { id: 'stint', header: 'Stint', hideBelow: 'md', cell: r => <span className="whitespace-nowrap tabular">{r.week_length_days}d from {fmtDate(r.cycle_start_date.slice(0, 10))}</span> },
    { id: 'status', header: 'Status', hideBelow: 'md', cell: r => <StatusBadge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</StatusBadge> },
  ];
  const DUTY_COLUMNS: Column<DutyEntry>[] = [
    { id: 'name', header: 'Official', sticky: true, cell: e => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{e.employee_name}</p><p className="font-mono text-caption text-ink-muted">{e.employee_id}</p></div> },
    { id: 'scope', header: 'Scope', cell: e => <StatusBadge tone={e.department ? 'brand' : 'neutral'}>{e.department || 'Mine-wide'}</StatusBadge> },
    { id: 'dates', header: 'Dates', hideBelow: 'md', cell: e => <span className="whitespace-nowrap tabular">{fmtDate(e.date_from.slice(0, 10))} to {fmtDate(e.date_to.slice(0, 10))}</span> },
    { id: 'contact', header: 'Contact', hideBelow: 'lg', cell: e => <ContactButtons phone={e.phone} name={e.employee_name} /> },
  ];
  const COVER_COLUMNS: Column<RotationCover>[] = [
    {
      id: 'who', header: 'Cover', sticky: true,
      cell: c => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{c.cover_employee_name}</p><p className="text-caption text-ink-muted">holding in place of {c.absent_employee_name}</p></div>,
    },
    {
      id: 'roster', header: 'Roster',
      cell: c => <span className="text-ink-muted">{(c.kind === 'standby' ? rotations.items : dutyRotations.items).find(r => r.id === c.rotation_id)?.name ?? `${c.kind} #${c.rotation_id}`}</span>,
    },
    { id: 'dates', header: 'Dates', hideBelow: 'md', cell: c => <span className="whitespace-nowrap tabular">{fmtDate(c.date_from.slice(0, 10))} to {fmtDate(c.date_to.slice(0, 10))}</span> },
    { id: 'contact', header: 'Contact', hideBelow: 'lg', cell: c => <ContactButtons phone={resolvePhone(c.cover_phone, employees, c.cover_employee_id)} name={c.cover_employee_name} /> },
  ];

  const weekLabel = `${fmtDate(anchor)} to ${fmtDate(addDays(anchor, 6))}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Standby' }]}
        title="Standby"
        description="Who stands standby each week, who holds in place of whom, and who answers as duty official."
        actions={<IconButton icon="refresh" label="Refresh standby" variant="ghost" pending={(rotations.loading && rotations.loaded) || (duty.loading && duty.loaded)} onClick={refresh} />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Standby views">
          <TabsTrigger value="week" icon="calendar">This week</TabsTrigger>
          <TabsTrigger value="month" icon="calendar">Month</TabsTrigger>
          <TabsTrigger value="rotations" icon="sync">Rotations</TabsTrigger>
          <TabsTrigger value="duty" icon="shield">Duty officials</TabsTrigger>
          <TabsTrigger value="covers" icon="swap">Covers</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <IconButton icon="chevron-left" label="Previous week" variant="outline" onClick={() => setAnchor(a => addDays(a, -7))} />
            <span className="min-w-52 text-center font-sans text-label font-medium tabular text-ink" aria-live="polite">{weekLabel}</span>
            <IconButton icon="chevron-right" label="Next week" variant="outline" onClick={() => setAnchor(a => addDays(a, 7))} />
            {anchor !== todayLocal() && <Button onClick={() => setAnchor(todayLocal())}>This week</Button>}
          </div>
          {dutyRotations.error && <Notice tone="warning" title="Duty rosters could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => dutyRotations.refetch()}>Try again</Button>}>{dutyRotations.error} The week below shows standby only.</Notice>}
          {duty.error && <Notice tone="warning" title="Duty officials could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => duty.refetch()}>Try again</Button>}>{duty.error} Explicitly named officials are missing below.</Notice>}
          {covers.error && <Notice tone="warning" title="Covers could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => covers.refetch()}>Try again</Button>}>{covers.error} Holders shown below may have cover named.</Notice>}
          {leaves.error && <Notice tone="warning" title="Leave records could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => leaves.refetch()}>Try again</Button>}>{leaves.error} Leave warnings are missing below.</Notice>}
          <DataRegion status={weekStatus} subject="standby rotations" error={rotations.error} onRetry={() => rotations.refetch()} empty={<EmptyState icon="clock" title="No standby rotations yet" description="Create a rotation to see who stands standby each week." />}>
            <WeekBoard
              rotations={rotations.items} dutyRotations={dutyRotations.items} duty={duty.items}
              covers={covers.items} leaves={leaves.items} leavesLoaded={leaves.loaded && !leaves.error}
              employees={employees} anchor={anchor} onCover={nameCover}
            />
          </DataRegion>
        </TabsContent>

        <TabsContent value="month" className="mt-4 flex flex-col gap-4">
          {dutyRotations.error && <Notice tone="warning" title="Duty rosters could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => dutyRotations.refetch()}>Try again</Button>}>{dutyRotations.error} The month below shows standby only.</Notice>}
          {duty.error && <Notice tone="warning" title="Duty officials could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => duty.refetch()}>Try again</Button>}>{duty.error} Explicitly named officials are missing below.</Notice>}
          {covers.error && <Notice tone="warning" title="Covers could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => covers.refetch()}>Try again</Button>}>{covers.error} Holders shown below may have cover named.</Notice>}
          {leaves.error && <Notice tone="warning" title="Leave records could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => leaves.refetch()}>Try again</Button>}>{leaves.error} Leave warnings are missing below.</Notice>}
          <DataRegion status={weekStatus} subject="standby rotations" error={rotations.error} onRetry={() => rotations.refetch()} empty={<EmptyState icon="calendar" title="No standby rotations yet" description="Create a rotation to see the month view." />}>
            <MonthBoard
              rotations={rotations.items} dutyRotations={dutyRotations.items} duty={duty.items}
              covers={covers.items} leaves={leaves.items} leavesLoaded={leaves.loaded && !leaves.error}
              employees={employees}
            />
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

        <TabsContent value="duty" className="mt-4 flex flex-col gap-6">
          <section className="flex flex-col gap-4" aria-labelledby="duty-rosters-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="duty-rosters-h" className="font-display text-section font-semibold text-ink">Duty rosters</h2>
              <Button variant="primary" icon="plus" onClick={() => { setEditingDutyRotation(null); setDutyRotationOpen(true); }}>New duty roster</Button>
            </div>
            <DataRegion status={dutyRotationsStatus} subject="duty rosters" error={dutyRotations.error} onRetry={() => dutyRotations.refetch()} empty={<EmptyState icon="shield" title="No duty rosters yet" description="Create one to set up who answers as duty official and in what order." />}>
              <DataTable caption="Duty rosters" rows={dutyRotations.items} columns={DUTY_ROTATION_COLUMNS} getRowId={r => String(r.id)}
                rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { setEditingDutyRotation(r); setDutyRotationOpen(true); }}>Edit</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Delete the ${r.name} duty roster`} onClick={() => removeDutyRotation(r)} /></span>} />
            </DataRegion>
          </section>
          <section className="flex flex-col gap-4" aria-labelledby="duty-overrides-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="duty-overrides-h" className="font-display text-section font-semibold text-ink">Explicitly named</h2>
                <p className="font-sans text-body-sm text-ink-muted">One-off officials for chosen dates — these win over the roster above where they overlap.</p>
              </div>
              <Button variant="primary" icon="plus" onClick={() => { setEditingDuty(null); setDutyOpen(true); }}>Name official</Button>
            </div>
            <DataRegion status={dutyStatus} subject="duty officials" error={duty.error} onRetry={() => duty.refetch()} empty={<EmptyState icon="shield" title="No duty officials named" description="Name who answers for the mine, and for which dates." />}>
              <DataTable caption="Duty officials" rows={duty.items} columns={DUTY_COLUMNS} getRowId={r => String(r.id)}
                rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { setEditingDuty(r); setDutyOpen(true); }}>Edit</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Remove ${r.employee_name} as duty official`} onClick={() => removeDuty(r)} /></span>} />
            </DataRegion>
          </section>
        </TabsContent>

        <TabsContent value="covers" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="primary" icon="plus" onClick={() => { setEditingCover(null); setCoverPreset(null); setCoverOpen(true); }}>Name cover</Button>
          </div>
          <DataRegion status={coversStatus} subject="covers" error={covers.error} onRetry={() => covers.refetch()} empty={<EmptyState icon="swap" title="No covers named" description="Name who holds in place of whom when someone is away." />}>
            <DataTable caption="Covers" rows={covers.items} columns={COVER_COLUMNS} getRowId={r => String(r.id)}
              rowActions={r => <span className="inline-flex gap-1"><Button size="sm" onClick={() => { setEditingCover(r); setCoverPreset(null); setCoverOpen(true); }}>Edit</Button><IconButton icon="delete" size="sm" variant="ghost" label={`Remove ${r.cover_employee_name}'s cover`} onClick={() => removeCover(r)} /></span>} />
          </DataRegion>
        </TabsContent>
      </Tabs>

      <RotationDialog open={rotationOpen} mode="standby" rotation={editingRotation} onOpenChange={setRotationOpen} onSave={saveRotation} />
      <RotationDialog open={dutyRotationOpen} mode="duty" rotation={editingDutyRotation} onOpenChange={setDutyRotationOpen} onSave={saveDutyRotation} />
      <DutyDialog open={dutyOpen} entry={editingDuty} onOpenChange={setDutyOpen} onSave={saveDuty} />
      <CoverDialog
        open={coverOpen} cover={editingCover} preset={coverPreset}
        standbyRotations={rotations.items} dutyRotations={dutyRotations.items}
        onOpenChange={o => { setCoverOpen(o); if (!o) { setEditingCover(null); setCoverPreset(null); } }} onSave={saveCover}
      />
    </div>
  );
}

export default function StandbyPage() {
  return <AppShell migrated><StandbyContent /></AppShell>;
}
