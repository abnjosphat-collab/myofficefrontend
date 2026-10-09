// app/drivers/page.tsx — Authorised Drivers Registry
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, Field, FormDialog, IconButton, Input, MetricGrid, MetricTile, Menu, MenuContent, MenuItem, MenuTrigger,
  PageHeader, RecordCard, SearchField, Segmented, Select, StatusBadge, Tag, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus,
  sortRows, useConfirm, useViewPreference, type Column, type SortState,
} from '@/components/ui-system';
import { formatDate } from '@/lib/format';
import type { Driver, DriverForm } from './types';
import { useDriversData, createDriver, updateDriver, deleteDriver } from './useDriversData';
import { exportExcel, exportPDF } from './exportDrivers';

const DEPARTMENTS = ['Mining', 'Engineering', 'Geology', 'Survey', 'Environment', 'Safety', 'HR', 'Finance', 'IT', 'Logistics', 'Security', 'Administration'];
const LICENSE_CLASSES = ['Code 08', 'Code 10', 'Code 14', 'EC', 'EC1', 'PrDP', 'Other'];
const STATUS_OPTIONS = [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }];
const STATUS_TONE = { active: 'success', inactive: 'neutral', suspended: 'warning' } as const;
const STATUS_ICON = { active: 'active', inactive: 'inactive', suspended: 'warning' } as const;
const ALL = '__all__';
const emptyForm = (): DriverForm => ({ full_name: '', phones: [''], department: '', license_class: '', license_expiry: '', status: 'active', notes: '' });

const isExpired = (expiry?: string) => !!expiry && new Date(expiry) < new Date();
const isExpiringSoon = (expiry?: string) => {
  if (!expiry) return false;
  const d = new Date(expiry); const soon = new Date(); soon.setDate(soon.getDate() + 30);
  return d >= new Date() && d <= soon;
};

const StatusTag = ({ status }: { status: Driver['status'] }) => <StatusBadge tone={STATUS_TONE[status] ?? 'neutral'} icon={STATUS_ICON[status] ?? 'info' as never}>{STATUS_OPTIONS.find(o => o.value === status)?.label ?? status}</StatusBadge>;

function LicenceExpiry({ expiry }: { expiry?: string }) {
  if (!expiry) return <span className="text-ink-muted">Not set</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="tabular whitespace-nowrap">{formatDate(expiry)}</span>
      {isExpired(expiry) ? <StatusBadge tone="danger" icon="expired">Expired</StatusBadge> : isExpiringSoon(expiry) ? <StatusBadge tone="warning" icon="due-soon">Expiring soon</StatusBadge> : null}
    </span>
  );
}

const PhoneLinks = ({ phones }: { phones?: string[] }) => (phones?.length ? (
  <span className="flex flex-col gap-0.5">{phones.map((p, i) => <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="focus-ring w-fit rounded-xs text-action underline underline-offset-2">{p}</a>)}</span>
) : <span className="text-ink-muted">None</span>);

function PhoneRows({ phones, onChange }: { phones: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {phones.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input type="tel" value={p} onChange={e => onChange(phones.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={i === 0 ? 'Primary number' : 'Additional number'} aria-label={i === 0 ? 'Primary phone number' : `Additional phone number ${i}`} autoComplete="tel" />
          {phones.length > 1 && <IconButton icon="close" variant="danger" label={`Remove phone number ${i + 1}`} onClick={() => onChange(phones.filter((_, idx) => idx !== i))} />}
        </div>
      ))}
      {phones.length < 4 && <Button size="sm" variant="ghost" icon="plus" className="w-fit" onClick={() => onChange([...phones, ''])}>Add a number</Button>}
    </div>
  );
}

function DriverDialog({ driver, departments, open, onOpenChange, onSaved }: { driver?: Driver; departments: string[]; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<DriverForm>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(driver?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false);
      setForm(driver ? { full_name: driver.full_name, phones: driver.phone_numbers?.length ? driver.phone_numbers : [''], department: driver.department || '', license_class: driver.license_class || '', license_expiry: driver.license_expiry?.slice(0, 10) || '', status: driver.status, notes: driver.notes || '' } : emptyForm());
    }
  }
  const set = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) => setForm(p => ({ ...p, [k]: v }));
  const allDepts = [...new Set([...DEPARTMENTS, ...departments])].sort();

  const submit = async () => {
    setTouched(true);
    if (!form.full_name.trim()) return false;
    const payload = {
      full_name: form.full_name.trim(), phone_numbers: form.phones.filter(p => p.trim()),
      department: form.department || null, license_class: form.license_class || null,
      license_expiry: form.license_expiry || null, status: form.status, notes: form.notes || null,
    };
    if (driver) await updateDriver(driver.id, payload); else await createDriver(payload);
    toast.success(driver ? 'Driver updated.' : 'Driver added.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={driver ? 'Edit driver' : 'Add driver'} description="Only the full name is required." submitLabel={driver ? 'Save changes' : 'Add driver'} onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Full name" required error={touched && !form.full_name.trim() ? 'Enter the full name.' : undefined}><Input value={form.full_name} onChange={e => set('full_name', e.target.value)} autoComplete="name" placeholder="For example, John Moyo" /></Field></div>
        <div className="sm:col-span-2"><Field label="Phone numbers" optional><PhoneRows phones={form.phones} onChange={v => set('phones', v)} /></Field></div>
        <Field label="Department" optional description="Choose a suggestion or type your own.">
          <Input list="driver-departments" value={form.department} onChange={e => set('department', e.target.value)} />
          <datalist id="driver-departments">{allDepts.map(d => <option key={d} value={d} />)}</datalist>
        </Field>
        <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set('status', v as DriverForm['status'])} options={STATUS_OPTIONS} /></Field>
        <Field label="Licence class" optional>
          <Input list="driver-licences" value={form.license_class} onChange={e => set('license_class', e.target.value)} placeholder="For example, Code 10 or PrDP" />
          <datalist id="driver-licences">{LICENSE_CLASSES.map(l => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Licence expiry" optional><Input type="date" value={form.license_expiry} onChange={e => set('license_expiry', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Notes" optional><Textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field></div>
      </div>
    </FormDialog>
  );
}

function DriversContent() {
  const confirm = useConfirm();
  const { drivers, loading, loaded, error, errorStatus, loadData } = useDriversData();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<'all' | Driver['status']>('all');
  const [view, setView] = useViewPreference('drivers', VIEW_CARDS_TABLE);
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<Driver | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const departments = useMemo(() => [...new Set(drivers.map(d => d.department).filter(Boolean) as string[])].sort(), [drivers]);
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return drivers
      .filter(d => statusFilter === 'all' || d.status === statusFilter)
      .filter(d => deptFilter === ALL || d.department === deptFilter)
      .filter(d => !s || d.full_name.toLowerCase().includes(s) || (d.department || '').toLowerCase().includes(s) || (d.license_class || '').toLowerCase().includes(s) || (d.phone_numbers || []).some(p => p.includes(s)) || (d.notes || '').toLowerCase().includes(s));
  }, [drivers, search, deptFilter, statusFilter]);
  const rows = useMemo(() => sortRows(filtered, sort, (d, id) => (id === 'license_expiry' ? d.license_expiry ?? '' : String(d[id as keyof Driver] ?? '').toLowerCase())), [filtered, sort]);
  const stats = useMemo(() => ({ total: drivers.length, active: drivers.filter(d => d.status === 'active').length, inactive: drivers.filter(d => d.status !== 'active').length, depts: departments.length }), [drivers, departments]);
  const grouped = useMemo(() => {
    const map = new Map<string, Driver[]>();
    for (const d of filtered) map.set(d.department || 'Unassigned', [...(map.get(d.department || 'Unassigned') ?? []), d]);
    return [...map.entries()].sort(([a], [b]) => (a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)));
  }, [filtered]);

  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: filtered.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const hasFilters = !!search || deptFilter !== ALL || statusFilter !== 'all';
  const filterLabel = [deptFilter !== ALL ? deptFilter : null, statusFilter !== 'all' ? statusFilter : null, search ? `"${search}"` : null].filter(Boolean).join(', ') || 'All departments';

  const openEditor = (d?: Driver) => { setEditing(d); setDialogOpen(true); };
  const remove = async (d: Driver) => {
    if (!await confirm({ title: `Remove ${d.full_name}?`, message: 'This cannot be undone.', confirmLabel: 'Remove', destructive: true })) return;
    try { await deleteDriver(d.id); toast.success('Driver removed.'); await loadData(); } catch (e) { toast.error((e as Error).message); }
  };

  const COLUMNS: Column<Driver>[] = [
    { id: 'full_name', header: 'Driver', sortable: true, sticky: true, cell: d => d.full_name },
    { id: 'department', header: 'Department', sortable: true, hideBelow: 'md', cell: d => d.department || <span className="text-ink-muted">None</span> },
    { id: 'status', header: 'Status', sortable: true, cell: d => <StatusTag status={d.status} /> },
    { id: 'license_class', header: 'Licence', sortable: true, hideBelow: 'md', cell: d => (d.license_class ? <Tag>{d.license_class}</Tag> : <span className="text-ink-muted">None</span>) },
    { id: 'license_expiry', header: 'Licence expiry', sortable: true, hideBelow: 'lg', cell: d => <LicenceExpiry expiry={d.license_expiry} /> },
    { id: 'phones', header: 'Phone', hideBelow: 'lg', cell: d => <PhoneLinks phones={d.phone_numbers} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core management' }, { label: 'Drivers' }]}
        title="Drivers"
        description="Licensed personnel approved to operate mine vehicles."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh drivers" variant="shell" pending={loading && loaded} onClick={() => loadData()} />
            <Menu>
              <MenuTrigger asChild><Button variant="secondary" icon="download" iconAfter="chevron-down" disabled={filtered.length === 0}>Download</Button></MenuTrigger>
              <MenuContent align="end" className="min-w-48">
                <MenuItem icon="table-view" onSelect={() => exportExcel(filtered)}>Export Excel</MenuItem>
                <MenuItem icon="pdf" onSelect={() => exportPDF(filtered, filterLabel)}>Export PDF</MenuItem>
              </MenuContent>
            </Menu>
            <Button variant="primary" icon="plus" onClick={() => openEditor()}>Add driver</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total drivers" value={stats.total} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Active" tone="success" value={stats.active} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Inactive or suspended" tone="warning" value={stats.inactive} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Departments" value={stats.depts} loading={pending} unavailable={unavailable} />
      </MetricGrid>

      <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, department or phone" wrapperClassName="min-w-56 max-w-md flex-1" />
        {departments.length > 0 && <Select className="w-48" aria-label="Filter by department" value={deptFilter} onValueChange={setDeptFilter} options={[{ value: ALL, label: 'All departments' }, ...departments.map(d => ({ value: d, label: d }))]} />}
        <Segmented label="Status" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS.map(o => ({ value: o.value as Driver['status'], label: o.label }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="drivers"
        error={error}
        onRetry={() => loadData()}
        empty={hasFilters
          ? <EmptyState icon="search" title="No drivers match" description="Try a different search or filter." action={<Button onClick={() => { setSearch(''); setDeptFilter(ALL); setStatusFilter('all'); }}>Clear filters</Button>} />
          : <EmptyState icon="drivers" title="No drivers yet" description="Add the first authorised driver to start the register." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>Add driver</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'driver' : 'drivers'}{filtered.length !== drivers.length ? ` of ${drivers.length}` : ''}</p>
        {view === 'cards' ? (
          <div className="flex flex-col gap-6">
            {grouped.map(([department, items]) => (
              <section key={department} aria-labelledby={`dept-${department}`}>
                <h2 id={`dept-${department}`} className="mb-3 font-display text-section font-semibold text-ink">{department}<span className="ml-2 font-sans text-label font-normal text-ink-muted">{items.length} {items.length === 1 ? 'driver' : 'drivers'}</span></h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {items.map(d => (
                    <RecordCard
                      key={d.id}
                      eyebrow={d.license_class || 'No licence class'}
                      title={d.full_name}
                      status={<StatusTag status={d.status} />}
                      facts={[
                        { label: 'Phone', value: <PhoneLinks phones={d.phone_numbers} /> },
                        { label: 'Licence expiry', value: <LicenceExpiry expiry={d.license_expiry} /> },
                        ...(d.notes ? [{ label: 'Notes', value: d.notes }] : []),
                      ]}
                      action={<IconButton icon="delete" variant="danger" size="sm" label={`Remove ${d.full_name}`} onClick={() => remove(d)} />}
                      onOpen={() => openEditor(d)}
                      openLabel={`Edit ${d.full_name}`}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <DataTable
            caption="Authorised drivers"
            rows={rows}
            columns={COLUMNS}
            getRowId={d => String(d.id)}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={openEditor}
            rowActions={d => (
              <span className="inline-flex gap-1">
                <IconButton icon="edit" size="sm" label={`Edit ${d.full_name}`} onClick={() => openEditor(d)} />
                <IconButton icon="delete" variant="danger" size="sm" label={`Remove ${d.full_name}`} onClick={() => remove(d)} />
              </span>
            )}
          />
        )}
      </DataRegion>

      <DriverDialog driver={editing} departments={departments} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => loadData()} />
    </div>
  );
}

export default function DriversPage() {
  return <AppShell migrated><DriversContent /></AppShell>;
}
