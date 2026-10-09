// FILE: app/condition-monitoring/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { SuggestField } from '@/components/shared/SuggestField';
import {
  Button, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, PageHeader, Segmented, Select,
  StatusBadge, Tag, Textarea, Toolbar, deriveDataStatus, isTransientStatus, sortRows, type Column, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { CMReading, CMResult, CMType } from './types';
import { useConditionMonitoringData, createCMReading } from './useConditionMonitoringData';
import { EXPORT_TONE_HEX } from '@/lib/status';

const CM_TYPES: CMType[] = ['Oil Analysis', 'Vibration', 'Thermography'];
const TYPE_LABEL: Record<CMType, string> = { 'Oil Analysis': 'Oil analysis', Vibration: 'Vibration', Thermography: 'Thermography' };
const RESULT_META: Record<CMResult, { label: string; tone: Tone; icon: 'success' | 'warning' | 'critical' }> = {
  normal: { label: 'Normal', tone: 'success', icon: 'success' },
  caution: { label: 'Caution', tone: 'warning', icon: 'warning' },
  critical: { label: 'Critical', tone: 'danger', icon: 'critical' },
};
const TYPE_FILTERS: { value: 'All' | CMType; label: string }[] = [{ value: 'All', label: 'All' }, ...CM_TYPES.map(type => ({ value: type, label: TYPE_LABEL[type] }))];
const EMPTY_FORM = { equipment: '', component: '', type: 'Vibration' as CMType, date: '', value: '', unit: '', result: 'normal' as CMResult, technician: '', notes: '' };

const exportColumns: DLColumn[] = [
  { key: 'equipment', label: 'Equipment', width: 24 },
  { key: 'component', label: 'Component', width: 20 },
  { key: 'type', label: 'Type', width: 16 },
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'value', label: 'Value', width: 14, format: (_v, row) => `${row.value ?? ''}${row.unit ? ` ${row.unit}` : ''}` },
  { key: 'result', label: 'Result', width: 12, format: v => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'technician', label: 'Technician', width: 18 },
  { key: 'notes', label: 'Notes', width: 30 },
];

const COLUMNS: Column<CMReading>[] = [
  { id: 'equipment', header: 'Equipment', sortable: true, sticky: true, cell: r => r.equipment },
  { id: 'component', header: 'Component', sortable: true, hideBelow: 'md', cell: r => r.component },
  { id: 'type', header: 'Type', sortable: true, hideBelow: 'md', cell: r => <Tag>{TYPE_LABEL[r.type] ?? r.type}</Tag> },
  { id: 'date', header: 'Date', sortable: true, cell: r => <span className="tabular whitespace-nowrap">{r.date ? formatDate(r.date) : 'Not set'}</span> },
  { id: 'value', header: 'Reading', numeric: true, cell: r => (r.value === '' ? <span className="text-ink-muted">None</span> : <span className="font-mono">{r.value} <span className="text-caption text-ink-muted">{r.unit}</span></span>) },
  { id: 'result', header: 'Result', sortable: true, cell: r => <StatusBadge tone={RESULT_META[r.result].tone} icon={RESULT_META[r.result].icon}>{RESULT_META[r.result].label}</StatusBadge> },
  { id: 'technician', header: 'Technician', hideBelow: 'lg', cell: r => r.technician },
  { id: 'notes', header: 'Notes', hideBelow: 'lg', className: 'max-w-xs truncate', cell: r => <span className="text-ink-muted" title={r.notes}>{r.notes}</span> },
];

function AddReadingDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm(current => ({ ...current, ...patch }));
  const valueText = form.value.trim();
  const valueInvalid = valueText !== '' && !Number.isFinite(Number(valueText));

  const submit = async () => {
    setTouched(true);
    if (!form.equipment.trim() || !form.date || valueInvalid) return false;
    await createCMReading({
      equipment_name: form.equipment, component: form.component, monitoring_type: form.type, sampled_date: form.date,
      // A reading of 0 is a real reading; only a blank value is stored as "none".
      value: valueText === '' ? null : Number(valueText),
      unit: form.unit, result: form.result, technician: form.technician, notes: form.notes,
    });
    toast.success(`Reading for ${form.equipment} was saved.`);
    setForm(EMPTY_FORM);
    setTouched(false);
    onCreated();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add reading" description="Equipment and date are required." submitLabel="Save reading" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Equipment" required error={touched && !form.equipment.trim() ? 'Enter the equipment.' : undefined}>
          <SuggestField historyKey="cm_equipment" placeholder="Equipment name" value={form.equipment} onChange={equipment => set({ equipment })} />
        </Field>
        <Field label="Component"><SuggestField historyKey="cm_component" placeholder="Component" value={form.component} onChange={component => set({ component })} /></Field>
        <Field label="Type">
          <Select aria-label="Type" value={form.type} onValueChange={type => set({ type: type as CMType })} options={CM_TYPES.map(type => ({ value: type, label: TYPE_LABEL[type] }))} />
        </Field>
        <Field label="Date" required error={touched && !form.date ? 'Choose the sample date.' : undefined}>
          <Input type="date" value={form.date} onChange={event => set({ date: event.target.value })} />
        </Field>
        <Field label="Value" optional error={touched && valueInvalid ? 'Enter a number.' : undefined}>
          <Input inputMode="decimal" value={form.value} onChange={event => set({ value: event.target.value })} />
        </Field>
        <Field label="Unit" optional><Input value={form.unit} onChange={event => set({ unit: event.target.value })} /></Field>
        <Field label="Result">
          <Select aria-label="Result" value={form.result} onValueChange={result => set({ result: result as CMResult })} options={(Object.keys(RESULT_META) as CMResult[]).map(result => ({ value: result, label: RESULT_META[result].label }))} />
        </Field>
        <Field label="Technician" optional><Input value={form.technician} onChange={event => set({ technician: event.target.value })} autoComplete="name" /></Field>
        <div className="sm:col-span-2"><Field label="Notes" optional><Textarea rows={3} value={form.notes} onChange={event => set({ notes: event.target.value })} /></Field></div>
      </div>
    </FormDialog>
  );
}

function ConditionMonitoringContent() {
  const { readings, loading, loaded, error, errorStatus, fetchReadings } = useConditionMonitoringData();
  const [tab, setTab] = useState<'All' | CMType>('All');
  const [adding, setAdding] = useState(false);
  const [sort, setSort] = useState<SortState>(null);

  const displayed = useMemo(() => (tab === 'All' ? readings : readings.filter(r => r.type === tab)), [readings, tab]);
  const rows = useMemo(() => sortRows(displayed, sort, (r, id) => (typeof r[id as keyof CMReading] === 'string' ? String(r[id as keyof CMReading]).toLowerCase() : r[id as keyof CMReading])), [displayed, sort]);
  const counts = { total: readings.length, critical: readings.filter(r => r.result === 'critical').length, caution: readings.filter(r => r.result === 'caution').length, normal: readings.filter(r => r.result === 'normal').length };
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: displayed.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Condition monitoring' }]}
        title="Condition monitoring"
        description="Oil analysis, vibration and thermography records."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh readings" variant="ghost" pending={loading && loaded} onClick={() => fetchReadings()} />
            {displayed.length > 0 && (
              <DownloadButton
                data={displayed as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Condition_Monitoring')}
                title="Condition Monitoring"
                statusColumn="result"
                statusColor={(_v, row) => EXPORT_TONE_HEX[RESULT_META[row.result as CMResult]?.tone ?? 'neutral']}
              />
            )}
            <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add reading</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total readings" value={counts.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Critical" tone="danger" value={counts.critical} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Caution" tone="warning" value={counts.caution} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Normal" tone="success" value={counts.normal} loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar>
        <Segmented label="Monitoring type" value={tab} onValueChange={setTab} options={TYPE_FILTERS} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="monitoring records"
        error={error}
        onRetry={() => fetchReadings()}
        empty={tab !== 'All'
          ? <EmptyState icon="search" title={`No ${TYPE_LABEL[tab].toLowerCase()} readings`} description="Choose a different type to see other readings." action={<Button onClick={() => setTab('All')}>Show all types</Button>} />
          : <EmptyState icon="analytics" title="No readings yet" description="Add the first oil analysis, vibration or thermography reading." action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add reading</Button>} />}
      >
        <DataTable caption="Condition monitoring records" rows={rows} columns={COLUMNS} getRowId={r => String(r.id)} sort={sort} onSortChange={setSort} />
      </DataRegion>

      <AddReadingDialog open={adding} onOpenChange={setAdding} onCreated={fetchReadings} />
    </div>
  );
}

export default function ConditionMonitoringPage() {
  return (
    <AppShell migrated>
      <ConditionMonitoringContent />
    </AppShell>
  );
}
