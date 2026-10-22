// app/ppe/page.tsx — personal protective equipment: who holds what, what is overdue or about to be, an order list for restocking, the
// replacement matrix that sets expiry dates, and the summaries and downloads. Everything on the page comes from the issued records.
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, EmptyState, IconButton, MetricGrid, MetricTile, Notice, PageHeader, RecordCard, SearchField, Segmented, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger,
  deriveDataStatus, isTransientStatus, useConfirm, MoreMenu, type MoreMenuItem,
  LoadingPulse,
} from '@/components/ui-system';
import { todayLocal } from '@/lib/dates';
import { formatMineNumber } from '@/lib/registerMatch';
import { normalizeSection } from '@/lib/sections';
import { enrichPPERecords, normalizeEmployeeId, type OrderListEntry } from './calcPPE';
import { DueItems } from './DueItems';
import { MatrixDialog } from './MatrixDialog';
import { OrderListView, type BasketAddables } from './OrderListView';
import { PPEBulkIssueForm } from './PPEBulkIssueForm';
import { PPEIssueForm } from './PPEIssueForm';
import { EmployeePPEDetail, PPEItemDetail, type ItemActions } from './PPEItemViews';
import { NO_EMPLOYEE_FILTERS, filterEmployees, groupByEmployee, renewalTarget, sectionCounts, standing, summarise, type EmployeeFilters, type EmployeeView } from './ppeLogic';
import { addableInWindow, addableSoon, buildBasket, coveredRecordIds, excludedRecordIds, weekWindow, type BasketRegister } from './orderBasket';
import { NO_TYPE_FILTER, loadTypeFilter, matchesTypeFilter, saveTypeFilter, typeOptions, type TypeFilter } from './ppeTypes';
import { typeName } from './ppeMeta';
import { SummaryView } from './SummaryView';
import { applyMatrixAll, applyMatrixType, createPPERecord, deletePPERecord, setMatrixInterval, setPPEStatus, updatePPERecord, usePPEMatrix, usePPERecords, useRosterRows } from './usePPEData';
import { useOrderList } from './useOrderList';
import type { EmployeeWithPPE, FormState, PPERecord } from './types';
import { useConfirmDelete } from '@/lib/useConfirmDelete';
import { summariseNames, useBulkDelete } from '@/lib/useBulkDelete';
import { RegisterFlag, RegisterNotice, useRegisterCheck } from '@/components/shared/RegisterCheck';

const ALL = 'all';

function PPEContent() {
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const { confirmBulkDelete, deleting } = useBulkDelete();
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const register = useRegisterCheck();
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [typeFilter, setTypeFilterState] = useState<TypeFilter>(() => (typeof window === 'undefined' ? NO_TYPE_FILTER : loadTypeFilter(k => window.localStorage.getItem(k))));
  // Patches merge functionally: the lens Reset fires two changes at once (clear the types, back to include), and two
  // full-object sets would clobber each other on the stale render's copy, leaving the old types behind.
  const patchTypeFilter = (patch: Partial<TypeFilter>) => setTypeFilterState(prev => ({ ...prev, ...patch }));
  useEffect(() => { saveTypeFilter((k, v) => window.localStorage.setItem(k, v), typeFilter); }, [typeFilter]);

  const records = useMemo(() => enrichPPERecords(recs.items, roster.items), [recs.items, roster.items]);
  const holders = useMemo(() => groupByEmployee(records, roster.items), [records, roster.items]);
  const today = todayLocal();
  const basketRegister = useMemo<BasketRegister>(() => {
    const known = new Set<string>(); const archived = new Set<string>();
    roster.items.forEach(e => { const id = normalizeEmployeeId(e.employee_id); if (!id) return; known.add(id); if (e.archived === true) archived.add(id); });
    return { known, archived };
  }, [roster.items]);
  const basket = useMemo(() => buildBasket(records, order.entries, basketRegister, today), [records, order.entries, basketRegister, today]);
  const covered = useMemo(() => coveredRecordIds(basket), [basket]);
  const shutOut = useMemo(() => excludedRecordIds(basket.excluded), [basket]);
  // The type lens narrows what the basket shows and offers, never what covers a record (adding stays gated on the whole
  // list) nor the tidy banner (data hygiene transcends the lens).
  const visibleByType = useMemo(() => records.filter(r => matchesTypeFilter(r.ppe_type, typeFilter)), [records, typeFilter]);
  const basketView = useMemo(() => {
    const b = buildBasket(visibleByType, order.entries, basketRegister, today);
    const lines = b.lines.filter(l => matchesTypeFilter(l.ppe_type, typeFilter));
    return { ...b, lines, counts: { auto: lines.filter(l => l.origin === 'auto').length, manual: lines.filter(l => l.origin === 'manual').length, free: lines.filter(l => l.origin === 'free').length, excluded: b.excluded.length }, twins: basket.twins, notDueLegacy: basket.notDueLegacy };
  }, [visibleByType, order.entries, basketRegister, today, basket, typeFilter]);
  const thisWeek = useMemo(() => weekWindow(today, 0), [today]);
  const nextWeek = useMemo(() => weekWindow(today, 1), [today]);
  const addables = useMemo<BasketAddables>(() => ({
    thisWeek: { ...thisWeek, records: addableInWindow(visibleByType, basketRegister, covered, shutOut, thisWeek.from, thisWeek.to) },
    nextWeek: { ...nextWeek, records: addableInWindow(visibleByType, basketRegister, covered, shutOut, nextWeek.from, nextWeek.to) },
    soon: addableSoon(visibleByType, basketRegister, covered, shutOut, today),
  }), [visibleByType, basketRegister, covered, shutOut, thisWeek, nextWeek, today]);
  // ?person= from a Personnel link: the matching card is ringed and scrolled to, once, without opening it.
  // Read once (a later navigation keeps its own URL); an unknown or filtered-out number is silently ignored.
  const params = useSearchParams();
  const [personParam] = useState(() => (params.get('person') || '').trim());
  const personTarget = useMemo(() => (personParam ? holders.find(h => normalizeEmployeeId(h.employee_id) === normalizeEmployeeId(personParam)) ?? null : null), [holders, personParam]);
  const personRef = useRef<HTMLLIElement | null>(null);
  const personScrolled = useRef(false);
  useEffect(() => {
    if (personTarget && personRef.current && !personScrolled.current) {
      personScrolled.current = true;
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      personRef.current.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
  }, [personTarget]);
  // Archived people are hidden from the browsing views by default but never from the data-quality notice
  // (unmatched), the issue form, the order list or the matrix (D17); due always excludes them (D18).
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = useMemo(() => holders.filter(h => h.archived === true).length, [holders]);
  const visibleHolders = useMemo(() => (showArchived ? holders : holders.filter(h => h.archived !== true)), [holders, showArchived]);
  const visibleRecords = useMemo(() => visibleHolders.flatMap(h => h.records), [visibleHolders]);
  const activeHolders = useMemo(() => holders.filter(h => h.archived !== true), [holders]);
  const sections = useMemo(() => sectionCounts(visibleHolders), [visibleHolders]);
  const dueSections = useMemo(() => sectionCounts(activeHolders), [activeHolders]);
  const inSection = useMemo(() => (f.section === ALL ? activeHolders : activeHolders.filter(h => normalizeSection(h.section) === f.section)), [activeHolders, f.section]);
  const sectionRecords = useMemo(() => inSection.flatMap(h => h.records), [inSection]);
  const unmatched = useMemo(() => holders.filter(h => register.matchOf(h) !== 'linked'), [holders, register]);
  const unmatchedRecordIds = useMemo(() => unmatched.flatMap(h => h.records.map(r => r.id)), [unmatched]);
  const shown = useMemo(() => filterEmployees(unmatchedOnly ? unmatched : visibleHolders, f), [visibleHolders, unmatched, unmatchedOnly, f]);
  const stats = useMemo(() => summarise(visibleRecords, visibleHolders), [visibleRecords, visibleHolders]);
  const scoped = useMemo(() => summarise(sectionRecords.filter(r => matchesTypeFilter(r.ppe_type, typeFilter)), inSection), [sectionRecords, inSection, typeFilter]);
  const lensPool = useMemo(() => { const arch = new Set(holders.filter(h => h.archived === true).map(h => normalizeEmployeeId(h.employee_id))); return records.filter(r => r.status === 'active' && !arch.has(normalizeEmployeeId(r.employee_id))); }, [records, holders]);
  const typeOpts = useMemo(() => typeOptions(lensPool), [lensPool]);
  const holder = useMemo(() => holders.find(h => h.employee_id === holderId) ?? null, [holders, holderId]);
  const item = useMemo(() => records.find(r => String(r.id) === itemId) ?? null, [records, itemId]);
  const itemReadOnly = item ? holders.find(h => h.employee_id === item.employee_id)?.archived === true : false;
  const hiddenAllArchived = !showArchived && archivedCount > 0 && visibleHolders.length === 0;
  const status = deriveDataStatus({ loaded: recs.loaded, loading: recs.loading, error: recs.error, errorStatus: recs.errorStatus, count: shown.length, transient: isTransientStatus(recs.errorStatus) });
  const tile = { loading: recs.loading && !recs.loaded, unavailable: !recs.loaded && !recs.loading };
  const set = (patch: Partial<EmployeeFilters>) => setF(prev => ({ ...prev, ...patch }));
  const filtered = unmatchedOnly || f.view !== 'all' || f.section !== ALL || f.search !== '';
  const reload = () => { void recs.refetch(); };

  const openIssue = (employee: EmployeeWithPPE | null = null) => { setHolderId(null); setForm({ record: null, prefill: null, employee, fulfils: null }); };
  const openEdit = (r: PPERecord) => { setItemId(null); setHolderId(null); setForm({ record: r, prefill: null, employee: holders.find(h => h.employee_id === r.employee_id) ?? null, fulfils: null }); };
  const issueFromOrder = (e: OrderListEntry) => {
    const h = holders.find(x => x.employee_id === e.employee_id) ?? null;
    const old = records.find(r => String(r.id) === e.record_id);
    setForm({ record: null, employee: h, fulfils: e.record_id, prefill: { id: '', employee_id: e.employee_id, employee_name: e.employee_name, position: h?.position ?? '', department: '', ppe_type: e.ppe_type, item_name: e.item_name, size: e.size, issue_date: todayLocal(), expiry_date: null, condition: 'good', status: 'active', notes: old?.notes ?? '', issued_by: old?.issued_by ?? '', location: old?.location ?? 'Workshop', mine_section: h?.section ?? '' } });
  };
  const save = async (data: FormState, id?: string) => {
    // Issuing from the order list renews the item that was on it: that record is updated in place and reads "In date" again, with its next
    // due date counted from the new issue date. It is not marked "returned": a worn-out or expired item is kept by the person.
    const renewed = id ? undefined : renewalTarget(records, form?.fulfils, data);
    if (id) { await updatePPERecord(id, data); order.remove(id); }
    else if (renewed) await updatePPERecord(String(renewed.id), { ...data, ...(renewed.updated_at ? { expected_updated_at: renewed.updated_at } : {}) });
    else await createPPERecord(data);
    if (form?.fulfils) order.remove(form.fulfils);
    order.removeFulfilled(data.employee_id, data.ppe_type, data.size);
    reload();
  };
  const remove = async (r: PPERecord) => {
    await confirmDelete({ title: 'Delete this PPE record?', message: `${typeName(r.ppe_type)} for ${r.employee_name}. This cannot be undone.`, what: 'The record', run: async () => { await deletePPERecord(r.id); setItemId(null); }, done: 'Record deleted.', after: () => recs.refetch() });
  };
  const removeUnmatched = () => {
    if (!unmatchedRecordIds.length) return;
    const n = unmatchedRecordIds.length;
    void confirmBulkDelete({
      title: `Delete ${n} unmatched PPE ${n === 1 ? 'record' : 'records'}?`,
      message: `All PPE records for ${summariseNames(unmatched.map(h => h.employee_name))}. This cannot be undone.`,
      ids: unmatchedRecordIds, run: id => deletePPERecord(String(id)), singular: 'PPE record', plural: 'PPE records', after: () => recs.refetch(),
    });
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
  const toggleArchive = async (r: PPERecord) => {
    const next = r.status === 'archived' ? 'active' : 'archived';
    try { await setPPEStatus(r.id, next); toast.success(next === 'archived' ? 'Archived.' : 'Restored to active.'); await recs.refetch(); }
    catch (e) { toast.error(`The status was not changed: ${(e as Error).message}`); }
  };
  const archiveAll = async (h: EmployeeWithPPE) => {
    const ids = h.records.filter(r => r.status !== 'archived').map(r => String(r.id));
    if (!ids.length) return;
    const results = await Promise.allSettled(ids.map(id => setPPEStatus(id, 'archived')));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (ok) toast.success(`${ok} ${ok === 1 ? 'item' : 'items'} archived.`);
    if (first) toast.error(`${ids.length - ok} could not be archived: ${(first.reason as Error).message}`);
    await recs.refetch();
  };
  const deleteAll = (h: EmployeeWithPPE) => {
    const ids = h.records.map(r => String(r.id));
    if (!ids.length) return;
    void confirmBulkDelete({
      title: `Delete all ${ids.length} PPE ${ids.length === 1 ? 'record' : 'records'} for ${h.employee_name}?`,
      message: `${summariseNames(h.records.map(r => typeName(r.ppe_type)))}. This cannot be undone.`,
      ids, run: id => deletePPERecord(String(id)), singular: 'PPE record', plural: 'PPE records',
      after: () => { setHolderId(null); recs.refetch(); },
    });
  };
  const addToOrder = (entries: OrderListEntry[]) => { const addable = entries.filter(e => !covered.has(e.record_id)); const fresh = addable.filter(e => !order.has(e.record_id)).length; order.addMany(addable); toast.success(fresh ? `${fresh} ${fresh === 1 ? 'item' : 'items'} added to the order list.` : 'Already on the order list.'); };
  const keepManual = (ids: string[]) => { ids.forEach(id => order.update(id, { kind: 'line', source: 'manual' })); };
  const actions: ItemActions = {
    onView: r => setItemId(String(r.id)), onEdit: openEdit, onDelete: remove, onToggleNotRequired: toggleNotRequired, onToggleArchive: toggleArchive,
    onOrder: r => { addToOrder([{ record_id: String(r.id), employee_id: r.employee_id, employee_name: r.employee_name, ppe_type: r.ppe_type, item_name: r.item_name, size: r.size, expiry_date: r.expiry_date }]); }, ordered: r => covered.has(String(r.id)),
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

  const cardMenuItems = (h: EmployeeWithPPE): MoreMenuItem[] => {
    const archivable = h.records.filter(r => r.status !== 'archived').length;
    return [
      { label: `Archive all ${archivable} ${archivable === 1 ? 'item' : 'items'}`, icon: 'archive', disabled: archivable === 0, onSelect: () => archiveAll(h) },
      { label: `Delete all ${h.records.length} ${h.records.length === 1 ? 'item' : 'items'}`, icon: 'delete', onSelect: () => deleteAll(h) },
    ];
  };
  const badges = (h: EmployeeWithPPE) => {
    if (h.records.length === 0) return <StatusBadge tone="neutral">No PPE issued yet</StatusBadge>;
    const o = h.records.filter(r => standing(r) === 'overdue').length; const s = h.records.filter(r => standing(r) === 'soon').length;
    return <>{o > 0 && <StatusBadge tone="danger">{o} overdue</StatusBadge>}{s > 0 && <StatusBadge tone="warning">{s} expiring soon</StatusBadge>}{o === 0 && s === 0 && <StatusBadge tone="success">Up to date</StatusBadge>}</>;
  };
  const VIEWS: { value: EmployeeView; label: string }[] = [
    { value: 'all', label: `Everyone (${visibleHolders.length})` }, { value: 'active', label: `Has active (${visibleHolders.filter(h => h.records.some(r => r.status === 'active')).length})` },
    { value: 'soon', label: `Expiring soon (${stats.employeesSoon})` }, { value: 'overdue', label: `Overdue (${stats.employeesOverdue})` },
    { value: 'none', label: `No PPE yet (${visibleHolders.filter(h => h.records.length === 0).length})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'PPE' }]}
        title="PPE"
        description="Who holds what, what is due, and what to order."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh PPE" variant="shell" pending={recs.loading && recs.loaded} onClick={reload} />
            <MoreMenu items={[{ label: 'Replacement matrix', icon: 'settings', onSelect: () => setMatrixOpen(true) }]} />
            <Button icon="plus" disabled={!recs.loaded} onClick={() => setBulkOpen(true)}>Bulk issue</Button>
            <Button variant="primary" icon="plus" disabled={!recs.loaded} onClick={() => openIssue()}>Issue PPE</Button>
          </>
        )}
      />
      {roster.error && !roster.loaded && <Notice tone="warning" title="The personnel register could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => roster.refetch()}>Try again</Button>}>{roster.error} Names and sections come from saved records until the register loads.</Notice>}

      <MetricGrid compact>
        <MetricTile compact label="People" value={stats.employees} selected={tab === 'employees' && f.view === 'all'} onClick={() => { setTab('employees'); set({ view: 'all' }); }} {...tile} />
        <MetricTile compact label="Active items" value={stats.active} selected={tab === 'employees' && f.view === 'active'} onClick={() => { setTab('employees'); set({ view: 'active' }); }} {...tile} />
        <MetricTile compact label="Expiring soon" tone={stats.soon ? 'warning' : 'default'} value={stats.soon} detail={recs.loaded ? `${stats.employeesSoon} ${stats.employeesSoon === 1 ? 'person' : 'people'}` : undefined} selected={tab === 'employees' && f.view === 'soon'} onClick={() => { setTab('employees'); set({ view: 'soon' }); }} {...tile} />
        <MetricTile compact label="Overdue" tone={stats.overdue ? 'danger' : 'default'} value={stats.overdue} detail={recs.loaded ? `${stats.employeesOverdue} ${stats.employeesOverdue === 1 ? 'person' : 'people'}` : undefined} selected={tab === 'employees' && f.view === 'overdue'} onClick={() => { setTab('employees'); set({ view: 'overdue' }); }} {...tile} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="PPE sections">
          <TabsTrigger value="employees" icon="employees">Employees</TabsTrigger>
          <TabsTrigger value="due" icon="overdue">Due items</TabsTrigger>
          <TabsTrigger value="order" icon="cart" count={order.loaded ? basketView.lines.length : undefined}>Order list</TabsTrigger>
          <TabsTrigger value="summary" icon="analytics">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search name, ID or position" wrapperClassName="min-w-48 max-w-sm flex-1" />
            <Select aria-label="Section" className="w-44" value={f.section} onValueChange={v => set({ section: v })} options={[{ value: ALL, label: 'All sections' }, ...sections.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} />
            {filtered && <Button variant="ghost" icon="close" onClick={() => { setF(NO_EMPLOYEE_FILTERS); setUnmatchedOnly(false); }}>Clear filters</Button>}
            {archivedCount > 0 && <Button size="sm" variant="ghost" icon="archive" aria-pressed={showArchived} onClick={() => setShowArchived(v => !v)}>{showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}</Button>}
          </div>
          <Segmented label="Show" value={f.view} onValueChange={v => set({ view: v as EmployeeView })} options={VIEWS} />
          <RegisterNotice count={unmatchedRecordIds.length} noun="PPE record" only={unmatchedOnly} onToggle={() => setUnmatchedOnly(v => !v)} onDeleteAll={unmatchedRecordIds.length > 0 ? { count: unmatchedRecordIds.length, pending: deleting, run: removeUnmatched } : undefined} />
          <DataRegion
            status={status} subject="PPE records" error={recs.error} onRetry={reload}
            empty={filtered
              ? <EmptyState icon="search" title="No one matches" description="Try fewer filters." action={<Button onClick={() => { setF(NO_EMPLOYEE_FILTERS); setUnmatchedOnly(false); }}>Clear filters</Button>} />
              : hiddenAllArchived
              ? <EmptyState icon="archive" title="Everyone with PPE is archived" description="Show them to look through their records." action={<Button onClick={() => setShowArchived(true)}>Show archived</Button>} />
              : <EmptyState icon="ppe" title="No PPE issued yet" description="Issue PPE to an employee to get started." action={<Button variant="primary" icon="plus" onClick={() => openIssue()}>Issue PPE</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted" role="status">{shown.length} {shown.length === 1 ? 'person' : 'people'}{shown.length !== visibleHolders.length ? ` of ${visibleHolders.length}` : ''}</p>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Employees">
              {shown.map(h => (
                <li key={h.employee_id} ref={h === personTarget ? personRef : undefined} className="relative">
                  <RecordCard
                    eyebrow={formatMineNumber(h.employee_id)} title={h.employee_name} subtitle={h.position || undefined} openLabel={`Open the PPE held by ${h.employee_name}`} onOpen={() => setHolderId(h.employee_id)} selected={h === personTarget} status={<>{badges(h)}<RegisterFlag match={register.matchOf(h)} />{h.archived === true && <StatusBadge tone="neutral">Archived</StatusBadge>}</>}
                    facts={[...(h.records.length > 0 ? [{ label: 'Items', value: `${h.records.filter(r => r.status === 'active').length} active of ${h.records.length}` }] : []), ...(h.section ? [{ label: 'Section', value: normalizeSection(h.section) }] : [])]}
                    action={<div className="flex items-center gap-1"><Button asChild size="sm" variant="ghost" icon="employees"><Link href={`/employees?highlight=${encodeURIComponent(h.employee_id)}`}>Personnel</Link></Button>{h.archived !== true && h.records.length > 0 && (<MoreMenu label={`More actions for ${h.employee_name}`} items={cardMenuItems(h)} />)}{h.archived !== true && <IconButton icon="plus" size="sm" variant="ghost" label={`Add PPE for ${h.employee_name}`} onClick={() => openIssue(h)} />}</div>}
                  />
                </li>
              ))}
            </ul>
          </DataRegion>
        </TabsContent>

        <TabsContent value="due" className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3"><Select aria-label="Section" className="w-44" value={f.section} onValueChange={v => set({ section: v })} options={[{ value: ALL, label: 'All sections' }, ...dueSections.map(([s, n]) => ({ value: s, label: `${s} (${n})` }))]} /></div>
          {recs.loaded ? <DueItems records={sectionRecords} counts={{ overdue: scoped.overdue, soon: scoped.soon }} actions={actions} onBulkNotRequired={bulkNotRequired} onAddToOrder={addToOrder} sectionActive={f.section !== ALL} typeFilter={typeFilter} typeOptions={typeOpts} onTypeFilterChange={patchTypeFilter} /> : (recs.error ? <p className="font-sans text-body-sm text-ink-muted">The PPE records could not be loaded; see the Employees tab.</p> : <LoadingPulse compact label="Loading PPE records" />)}
        </TabsContent>

        <TabsContent value="order" className="mt-4">
          <DataRegion
            status={deriveDataStatus({ loaded: order.loaded, loading: order.loading, error: order.error, errorStatus: order.errorStatus, count: 1, transient: isTransientStatus(order.errorStatus) })}
            subject="the order list" error={order.error} onRetry={() => { void order.refetch(); }}
          >
            <OrderListView basket={basketView} addables={addables} typeFilter={typeFilter} typeOptions={typeOpts} onTypeFilterChange={patchTypeFilter} onIssue={issueFromOrder} onRemove={order.remove} onRemoveMany={order.removeMany} onExclude={line => { order.exclude(line); toast.success('Excluded from the automatic list. Restore it below to bring it back.'); }} onRestore={order.restore} onUpdate={order.update} onKeepManual={keepManual} onAddMany={addToOrder} onAddFree={draft => { order.addFree(draft); toast.success('Free line added to the order list.'); }} onClearManual={order.clearManual} />
          </DataRegion>
        </TabsContent>
        <TabsContent value="summary" className="mt-4">{recs.loaded ? <SummaryView records={visibleRecords} employeeCount={visibleHolders.length} /> : (recs.error ? <p className="font-sans text-body-sm text-ink-muted">The PPE records could not be loaded; see the Employees tab.</p> : <LoadingPulse compact label="Loading PPE records" />)}</TabsContent>
      </Tabs>

      <EmployeePPEDetail employee={holder} onClose={() => setHolderId(null)} onIssue={openIssue} actions={actions} readOnly={holder?.archived === true} />
      <PPEItemDetail item={item} onClose={() => setItemId(null)} onEdit={openEdit} readOnly={itemReadOnly} />
      <PPEIssueForm open={!!form} record={form?.record ?? null} prefill={form?.prefill ?? null} employee={form?.employee ?? null} matrix={matrix.matrix} onOpenChange={o => { if (!o) setForm(null); }} onSave={save} />
      <PPEBulkIssueForm open={bulkOpen} records={records} matrix={matrix.matrix} onOpenChange={setBulkOpen} onCreated={reload} />
      <MatrixDialog open={matrixOpen} onOpenChange={setMatrixOpen} matrix={matrix.matrix} loading={matrix.loading} error={matrix.error} onRetry={matrix.refetch} records={records} onSetInterval={setInterval} onRecalculate={recalc} onRecalculateAll={recalcAll} />
    </div>
  );
}

export default function PPEPage() {
  return <AppShell migrated><Suspense fallback={null}><PPEContent /></Suspense></AppShell>;
}
