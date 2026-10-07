// app/maintenance-preview/schedules/page.tsx — Schedules, pattern R: filter tiles, toolbar, cards or table, and a New schedule dialog that shows the next dates.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, DataTable, EmptyState, Field, FormDialog, Input, MetricGrid, MetricTile, RecordCard, SearchField, Select, StatusBadge, Toolbar, ViewToggle, VIEW_CARDS_TABLE, useViewPreference, type Column } from '@/components/ui-system';
import { MACHINES, dayOffset, fmt, fmtLong, rel, type Schedule } from '../fixtures';
import { PageFrame } from '../parts';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

type Filter = 'all' | 'active' | 'paused' | 'soon';
const RULES = [{ value: '7', label: 'Every week' }, { value: '14', label: 'Every 2 weeks' }, { value: '30', label: 'Every month' }, { value: '90', label: 'Every 3 months' }];
const Active = ({ s }: { s: Schedule }) => <StatusBadge tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Paused'}</StatusBadge>;

export default function SchedulesPage() {
  const { schedules, toggleSchedule } = usePreview();
  const [view, setView] = useViewPreference('maintenance-preview-sched', VIEW_CARDS_TABLE);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(''); const [machine, setMachine] = useState(''); const [rule, setRule] = useState('7');
  const soon = (s: Schedule) => s.active && s.next <= dayOffset(7);
  const counts = useMemo(() => ({ all: schedules.length, active: schedules.filter(s => s.active).length, paused: schedules.filter(s => !s.active).length, soon: schedules.filter(soon).length }), [schedules]);
  const rows = useMemo(() => schedules.filter(s => (filter === 'all' || (filter === 'soon' ? soon(s) : filter === 'active' ? s.active : !s.active)) && (!q.trim() || [s.name, ...s.machines].some(x => x.toLowerCase().includes(q.trim().toLowerCase())))), [schedules, filter, q]);
  const filtered = filter !== 'all' || q !== '';
  const clear = () => { setFilter('all'); setQ(''); };
  const toggle = (f: Filter) => setFilter(cur => (cur === f ? 'all' : f));
  const preview = [1, 2, 3].map(n => dayOffset(Number(rule) * n));
  const actionsOf = (s: Schedule) => <Button size="sm" onClick={() => toggleSchedule(s.id)}>{s.active ? 'Pause' : 'Resume'}</Button>;

  const COLUMNS: Column<Schedule>[] = [
    { id: 'name', header: 'Schedule', sticky: true, cell: s => <div className="min-w-0"><p className="font-medium text-ink">{s.name}</p><p className="text-caption text-ink-muted">{s.machines.join(', ')}</p></div> },
    { id: 'rule', header: 'Repeats', hideBelow: 'md', cell: s => s.rule },
    { id: 'next', header: 'Next', cell: s => <span className="tabular">{fmtLong(s.next)}, {rel(s.next)}</span> },
    { id: 'status', header: 'Status', cell: s => <Active s={s} /> },
  ];

  return (
    <PageFrame crumb="Schedules" title="Maintenance schedules" description="Recurring work that raises a work order on each due date." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New schedule</Button>}>
      <MetricGrid compact>
        <MetricTile compact label="Schedules" value={counts.all} selected={filter === 'all'} onClick={clear} />
        <MetricTile compact label="Active" tone="success" value={counts.active} selected={filter === 'active'} onClick={() => toggle('active')} />
        <MetricTile compact label="Paused" value={counts.paused} selected={filter === 'paused'} onClick={() => toggle('paused')} />
        <MetricTile compact label="Due in 7 days" tone={counts.soon ? 'warning' : 'default'} value={counts.soon} selected={filter === 'soon'} onClick={() => toggle('soon')} />
      </MetricGrid>

      <Toolbar filtered={filtered} onClear={clear} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={q} onValueChange={setQ} placeholder="Search schedule or machine" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon="calendar" title={filtered ? 'No schedules match' : 'No recurring schedules yet'} description={filtered ? 'Try fewer filters or a different search.' : 'A schedule raises a work order on its dates.'} action={filtered ? <Button onClick={clear}>Clear filters</Button> : <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New schedule</Button>} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted">{rows.length} {rows.length === 1 ? 'schedule' : 'schedules'}{rows.length !== schedules.length ? ` of ${schedules.length}` : ''}</p>
          {view === 'cards' ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Schedules">
              {rows.map(s => (
                <li key={s.id} className="relative">
                  <RecordCard eyebrow={s.rule} title={s.name} subtitle={s.machines.join(', ')} openLabel={`${s.name}: ${s.active ? 'active' : 'paused'}`} status={<Active s={s} />}
                    facts={[{ label: 'Next', value: <span className="tabular">{fmtLong(s.next)}, {rel(s.next)}</span> }, { label: 'Then', value: <span className="tabular">{s.dates.slice(1, 3).map(fmt).join(', ')}</span> }, { label: 'Raises', value: `${s.machines.length} work order${s.machines.length === 1 ? '' : 's'}` }]} action={actionsOf(s)} />
                </li>
              ))}
            </ul>
          ) : <DataTable caption="Schedules" rows={rows} columns={COLUMNS} getRowId={s => String(s.id)} rowActions={actionsOf} />}
        </>
      )}

      <FormDialog open={creating} onOpenChange={setCreating} size="md" title="New schedule" description="It raises a work order on each date." submitLabel="Save schedule"
        onSubmit={async () => { if (!name.trim() || !machine.trim()) throw new Error('Name the schedule and choose a machine.'); toast.success('Schedule saved (preview only).'); setName(''); setMachine(''); }}>
        <div className="flex flex-col gap-4">
          <Field label="Name" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly pump inspection" /></Field>
          <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
          <Field label="How often"><Select aria-label="How often" value={rule} onValueChange={setRule} options={RULES} /></Field>
          <p className="rounded-control bg-surface-subtle p-3 font-sans text-body-sm text-ink" aria-live="polite"><span className="text-ink-muted">Next dates: </span><span className="tabular">{preview.map(fmtLong).join(', ')}</span></p>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
