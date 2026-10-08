// app/ppe/page.tsx — personal protective equipment: who holds what, what is overdue or about to be, an order list for restocking, the
// replacement matrix that sets expiry dates, and the summaries and downloads. Everything on the page comes from the issued records.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, EmptyState, IconButton, MetricGrid, MetricTile, Notice, PageHeader, RecordCard, SearchField, Segmented, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger,
  deriveDataStatus, isTransientStatus, useConfirm, MoreMenu,
  LoadingPulse,
} from '@/components/ui-system';
import { todayLocal } from '@/lib/dates';
import { normalizeSection } from '@/lib/sections';
import { enrichPPERecords, type OrderListEntry } from './calcPPE';
import { DueItems } from './DueItems';
import { MatrixDialog } from './MatrixDialog';
import { OrderListView } from './OrderListView';
import { PPEIssueForm } from './PPEIssueForm';
import { EmployeePPEDetail, PPEItemDetail, type ItemActions } from './PPEItemViews';
import { NO_EMPLOYEE_FILTERS, filterEmployees, groupByEmployee, sectionCounts, selectableEmployees, standing, summarise, type EmployeeFilters, type EmployeeView } from './ppeLogic';
import { typeName } from './ppeMeta';
import { SummaryView } from './SummaryView';
import { applyMatrixAll, applyMatrixType, createPPERecord, deletePPERecord, setMatrixInterval, setPPEStatus, updatePPERecord, usePPEMatrix, usePPERecords, useRosterRows } from './usePPEData';
import { useOrderList } from './useOrderList';
import type { EmployeeWithPPE, FormState, PPERecord } from './types';

const ALL = 'all';

function PPEContent() {
  const confirm = useConfirm();
  const recs = usePPERecords();
  const roster = useRosterRows();
  const matrix = usePPEMatrix();
  const order = useOrderList();
  const [tab, setTab] = useState('employees');
  const [f, setF] = useState<EmployeeFilters>(NO_EMPLOYEE_FILTERS);
  const [form, setForm] = useState<{ record: PPERecord | null; prefill: PPERecord | null; employee: EmployeeWithPPE | null; fulfils: string | null } | null>(null);
  const [holderId, setHolderId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [matrixOpen, setMatrixOpen] = useState(false);

  const records = useMemo(() => enrichPPERecords(recs.items, roster.items), [recs.items, roster.items]);
  const holders = useMemo(() => groupByEmployee(records, roster.items), [records, roster.items]);
  const people = useMemo(() => selectableEmployees(roster.items, holders), [roster.items, holders]);
  const sections = useMemo(() => sectionCounts(holders), [holders]);
  const inSection = useMemo(() => (f.section === ALL ? holders : holders.filter(h => normalizeSection(h.section) === f.section)), [holders, f.section]);
  const sectionRecords = useMemo(() => inSection.flatMap(h => h.records), [inSection]);
  const shown = useMemo(() => filterEmployees(holders, f), [holders, f]);
  const stats = useMemo(() => summarise(records, holders), [records, holders]);
  const scoped = useMemo(() => summarise(sectionRecords, inSection), [sectionRecords, inSection]);
  const holder = useMemo(() => holders.find(h => h.employee_id === holderId) ?? null, [holders, holderId]);
  const item = useMemo(() => records.find(r => String(r.id) === itemId) ?? null, [records, itemId]);
  const status = deriveDataStatus({ loaded: recs.loaded, loading: recs.loading, error: recs.error, errorStatus: recs.errorStatus, count: shown.length, transient: isTransientStatus(recs.errorStatus) });
  const tile = { loading: recs.loading && !recs.loaded, unavailable: !recs.loaded && !recs.loading };
  const set = (patch: Partial<EmployeeFilters>) => setF(prev => ({ ...prev, ...patch }));
  const filtered = f.view !== 'all' || f.section !== ALL || f.search !== '';
  const reload = () => { void recs.refetch(); };

  const openIssue = (employee: EmployeeWithPPE | null = null) => { setHolderId(null); setForm({ record: null, prefill: null, employee, fulfils: null }); };
  const openEdit = (r: PPERecord) => { setItemId(null); setHolderId(null); setForm({ record: r, prefill: null, employee: holders.find(h => h.employee_id === r.employee_id) ?? null, fulfils: null }); };
  const issueFromOrder = (e: OrderListEntry) => {
    const h = holders.find(x => x.employee_id === e.employee_id) ?? null;
    setForm({ record: null, employee: h, fulfils: e.record_id, prefill: { id: '', employee_id: e.employee_id, employee_name: e.employee_name, position: h?.position ?? '', department: '', ppe_type: e.ppe_type, item_name: e.item_name, size: e.size, issue_date: todayLocal(), expiry_date: null, condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: h?.section ?? '' } });
  };
  const save = async (data: FormState, id?: string) => {
    if (id) { await updatePPERecord(id, data); order.remove(id); } else await createPPERecord(data);
    const replaced = form?.fulfils ? records.find(r => String(r.id) === form.fulfils && r.status === 'active') : undefined;
    if (form?.fulfils) order.remove(form.fulfils);
    // Issuing from the order list replaces the item that was due: retire it, or the card keeps showing it as due.
    if (replaced) {
      try { await setPPEStatus(replaced.id, 'returned'); }
      catch (e) { toast.error(`The new item was issued, but the old ${typeName(replaced.ppe_type)} was not marked returned: ${(e as Error).message}`); }
    }
    order.removeFulfilled(data.employee_id, data.ppe_type, data.size);
    reload();
  };
  const remove = async (r: PPERecord) => {
    if (!await confirm({ title: 'Delete this PPE record?', message: `${typeName(r.ppe_type)} for ${r.employee_name}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deletePPERecord(r.id); setItemId(null); toast.success('Record deleted.'); await recs.refetch(); }
    catch (e) { toast.error(`The record was not deleted: ${(e as Error).message}`); }
  };
  const toggleNotRequired = async (r: PPERecord) => {
    const next = r.status === 'not_required' ? 'active' : 'not_required';
    try { await setPPEStatus(r.id, next); toast.success(next === 'not_required' ? 'Marked as not required.' : 'Marked active again.'); await recs.refetch(); }
    catch (e) { toast.error(`The status was not changed: ${(e as Error).message}`); }
  };
  const bulkNotRequired = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map(id => setPPEStatus(id, 'not_required')));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (ok) toast.success(`${ok} ${ok === 1 ? 'item' : 'items'} marked not required.`);
    if (first) toast.error(`${ids.length - ok} could not be updated: ${(first.reason as Error).message}`);
    await recs.refetch();
  };
  const addToOrder = (entries: OrderListEntry[]) => { const fresh = entries.filter(e => !order.has(e.record_id)).length; order.addMany(entries); toast.success(fresh ? `${fresh} ${fresh === 1 ? 'item' : 'items'} added to the order list.` : 'Already on the order list.'); };
  const actions: ItemActions = {
    onView: r => setItemId(String(r.id)), onEdit: openEdit, onDelete: remove, onToggleNotRequired: toggleNotRequired,
    onOrder: r => { addToOrder([{ record_id: String(r.id), employee_id: r.employee_id, employee_name: r.employee_name, ppe_type: r.ppe_type, item_name: r.item_name, size: r.size, expiry_date: r.expiry_date }]); }, ordered: r => order.has(String(r.id)),
  };

  const setInterval = async (type: string, months: number) => {
    const res = await setMatrixInterval(type, months);
    matrix.setMatrix(m => ({ ...m, [type]: months }));
    toast.success(res?.updated ? `Interval saved. ${res.updated} existing ${res.updated === 1 ? 'item' : 'items'} recalculated.` : 'Interval saved.');
    if (res?.updated) reload();
  };
  const recalc = async (type: string) => {
    const count = records.filter(r => r.ppe_type === type && r.status === 'active').length;
    const months = matrix.matrix[type];
    if (!await confirm({ title: months === 0 ? `Clear the expiry on ${count} active ${typeName(type)} items?` : `Reset the expiry of ${count} active ${typeName(type)} items to issue date plus ${months} months?`, message: 'This overwrites their current expiry dates.', confirmLabel: 'Recalculate', destructive: true })) return;
    const res = await applyMatrixType(type);
    toast.success(`Recalculated ${res?.updated ?? count} ${typeName(type)} items.`); reload();
  };
  const recalcAll = async () => {
    const n = records.filter(r => r.status === 'active').length;
    if (!await confirm({ title: `Recalculate the expiry of all ${n} active items?`, message: 'Uses the current matrix for every type and overwrites their current expiry dates.', confirmLabel: 'Recalculate all', destructive: true })) return;
    const res = await applyMatrixAll();
    toast.success(`Recalculated ${res?.total_updated ?? 0} items across all types.`);
    if (res?.failed?.length) throw new Error(`These types could not be recalculated: ${res.failed.map(typeName).join(', ')}.`);
    reload();
  };

  const badges = (h: EmployeeWithPPE) => {
    const o = h.records.filter(r => standing(r) === 'overdue').length; const s = h.records.filter(r => standing(r) === 'soon').length;
    return <>{o > 0 && <StatusBadge tone="danger">{o} overdue</StatusBadge>}{s > 0 && <StatusBadge tone="warning">{s} expiring soon</StatusBadge>}{o === 0 && s === 0 && <StatusBadge tone="success">Up to date</StatusBadge>}</>;
  };
  const VIEWS: { value: EmployeeView; label: string }[] = [
    { value: 'all', label: `Everyone (${holders.length})` }, { value: 'active', label: `Has active (${holders.filter(h => h.records.some(r => r.status === 'active')).length})` },
    { value: 'soon', label: `Expiring soon (${stats.employeesSoon})` }, { value: 'overdue', label: `Overdue (${stats.employeesOverdue})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'PPE' }]}
        title="PPE management"
        description="Who holds what, what is due, and what to order."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh PPE" variant="ghost" pending={recs.loading && recs.loaded} onClick={reload} />
            <MoreMenu items={[{ label: 'Replacement matrix', icon: 'settings', onSelect: () => setMatrixOpen(true) }]} />
            <Button variant="primary" icon="plus" disabled={!recs.loaded} onClick={() => openIssue()}>Issue PPE</Button>
          </>
        )}
      />
      {roster.error && !roster.loaded && <Notice tone="warning" title="The personnel register could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => roster.refetch()}>Try again</Button>}>{roster.error} Names and sections come from it; the issue form still works by typing.</Notice>}

      <MetricGrid compact>
        <MetricTile compact label="People" value={stats.employees} selected={tab === 'employees' && f.view === 'all'} onClick={() => { setTab('employees'); set({ view: 'all' }); }} {...tile} />
        <MetricTile compact label="Active items" value={stats.active} selected={tab === 'employees' && f.view === 'active'} onClick={() => { setTab('employees'); set({ view: 'active' }); }} {...tile} />
        <MetricTile compact label="Expiring soon" tone={stats.soon ? 'warning' : 'default'} value={stats.soon} detail={recs.loaded ? `${stats.employeesSoon} ${stats.employeesSoon === 1 ? 'person' : 'people'}` : undefined} selected={tab === 'employees' && f.view === 'soon'} onClick={() => { setTab('employees'); set({ view: 'soon' }); }} {...tile} />
        <MetricTile compact label="Overdue" tone={stats.overdue ? 'danger' : 'default'} value={stats.overdue} detail={recs.loaded ? `${stats.employeesOverdue} ${stats.employeesOverdue === 1 ? 'person' : 'people'}` : undefined} selected={tab === 'employees' && f.view === 'overdue'} onClick={() => { setTab('employees'); set({ view: 'overdue' }); }} {...tile} />
        <MetricTile compact label="On the order list" value={order.entries.length} loading={order.loading && !order.loaded} unavailable={!order.loaded && !order.loading} selected={tab === 'order'} onClick={() => setTab('order')} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="PPE sections">
          <TabsTrigger value="employees" icon="employees">Employees</TabsTrigger>
          <TabsTrigger value="due" icon="overdue">Due items</TabsTrigger>
          <TabsTrigger value="order" icon="cart">{`Order list${order.loaded && order.entries.length ? ` (${order.entries.length})` : ''}`}</TabsTrigger>
          <TabsTrigger value="summary" icon="analytics">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search name, ID or position" wrapperClassName="min-w-48 max-w-sm flex-1" />
            <Select aria-label="Section" className="w-44" value={f.section} onValueChange={v => set({ section: v })} options={[{ value: ALL, label: 'All sections' }, ...sections.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} />
            {filtered && <Button variant="ghost" icon="close" onClick={() => setF(NO_EMPLOYEE_FILTERS)}>Clear filters</Button>}
          </div>
          <Segmented label="Show" value={f.view} onValueChange={v => set({ view: v as EmployeeView })} options={VIEWS} />
          <DataRegion
            status={status} subject="PPE records" error={recs.error} onRetry={reload}
            empty={filtered
              ? <EmptyState icon="search" title="No one matches" description="Try fewer filters." action={<Button onClick={() => setF(NO_EMPLOYEE_FILTERS)}>Clear filters</Button>} />
              : <EmptyState icon="ppe" title="No PPE issued yet" description="Issue PPE to an employee to get started." action={<Button variant="primary" icon="plus" onClick={() => openIssue()}>Issue PPE</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted" role="status">{shown.length} {shown.length === 1 ? 'person' : 'people'}{shown.length !== holders.length ? ` of ${holders.length}` : ''}</p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Employees with PPE">
              {shown.map(h => (
                <li key={h.employee_id} className="relative">
                  <RecordCard
                    eyebrow={h.employee_id} title={h.employee_name} subtitle={h.position || undefined} openLabel={`Open the PPE held by ${h.employee_name}`} onOpen={() => setHolderId(h.employee_id)} status={badges(h)}
                    facts={[{ label: 'Items', value: `${h.records.filter(r => r.status === 'active').length} active of ${h.records.length}` }, ...(h.section ? [{ label: 'Section', value: normalizeSection(h.section) }] : [])]}
                    action={<IconButton icon="plus" size="sm" variant="ghost" label={`Add PPE for ${h.employee_name}`} onClick={() => openIssue(h)} />}
                  />
                </li>
              ))}
            </ul>
          </DataRegion>
        </TabsContent>

        <TabsContent value="due" className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3"><Select aria-label="Section" className="w-44" value={f.section} onValueChange={v => set({ section: v })} options={[{ value: ALL, label: 'All sections' }, ...sections.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} /></div>
          {recs.loaded ? <DueItems records={sectionRecords} counts={{ overdue: scoped.overdue, soon: scoped.soon }} actions={actions} onBulkNotRequired={bulkNotRequired} onAddToOrder={addToOrder} sectionActive={f.section !== ALL} /> : (recs.error ? <p className="font-sans text-body-sm text-ink-muted">The PPE records could not be loaded; see the Employees tab.</p> : <LoadingPulse compact label="Loading PPE records" />)}
        </TabsContent>

        <TabsContent value="order" className="mt-4">
          <DataRegion
            status={deriveDataStatus({ loaded: order.loaded, loading: order.loading, error: order.error, errorStatus: order.errorStatus, count: 1, transient: isTransientStatus(order.errorStatus) })}
            subject="the order list" error={order.error} onRetry={() => { void order.refetch(); }}
          >
            <OrderListView entries={order.entries} onRemove={order.remove} onClear={order.clear} onIssue={issueFromOrder} />
          </DataRegion>
        </TabsContent>
        <TabsContent value="summary" className="mt-4">{recs.loaded ? <SummaryView records={records} employeeCount={holders.length} /> : (recs.error ? <p className="font-sans text-body-sm text-ink-muted">The PPE records could not be loaded; see the Employees tab.</p> : <LoadingPulse compact label="Loading PPE records" />)}</TabsContent>
      </Tabs>

      <EmployeePPEDetail employee={holder} onClose={() => setHolderId(null)} onIssue={openIssue} actions={actions} />
      <PPEItemDetail item={item} onClose={() => setItemId(null)} onEdit={openEdit} />
      <PPEIssueForm open={!!form} record={form?.record ?? null} prefill={form?.prefill ?? null} employee={form?.employee ?? null} employees={people} matrix={matrix.matrix} onOpenChange={o => { if (!o) setForm(null); }} onSave={save} />
      <MatrixDialog open={matrixOpen} onOpenChange={setMatrixOpen} matrix={matrix.matrix} loading={matrix.loading} error={matrix.error} onRetry={matrix.refetch} records={records} onSetInterval={setInterval} onRecalculate={recalc} onRecalculateAll={recalcAll} />
    </div>
  );
}

export default function PPEPage() {
  return <AppShell migrated><PPEContent /></AppShell>;
}
