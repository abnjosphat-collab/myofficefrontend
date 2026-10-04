// app/issues/page.tsx — stock issues: record what was issued to whom, browse the log, analyse the costs.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Dialog, EmptyState, IconButton, Input, MetricGrid, MetricTile, Menu, MenuContent, MenuItem, MenuTrigger, Notice, PageHeader,
  SearchField, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, deriveDataStatus, isTransientStatus, sortRows, useConfirm,
  type Column, type SortState,
} from '@/components/ui-system';
import { fmtDateTime, formatCurrency, formatCurrencyShort, lineTotal } from '@/components/shared/utils';
import { useAuth } from '@/lib/auth-context';
import { AnalyticsPanel } from './AnalyticsPanel';
import { IssueForm } from './IssueForm';
import { hasPrice, issueCost } from './analytics';
import { exportIssuesExcel, exportIssuesPdf } from './exportIssues';
import { deleteIssue, useIssuesData } from './useIssuesData';
import type { StockIssue } from './types';

function IssuesContent() {
  const confirm = useConfirm();
  const { profile } = useAuth();
  const { issues: list, stats, spares, refresh } = useIssuesData();
  const issues = list.items;
  const [tab, setTab] = useState('log');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState<SortState>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const viewing = useMemo(() => issues.find(i => i.id === viewingId) ?? null, [issues, viewingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter(i => {
      const day = (i.issued_at || '').slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return !q || [i.recipient_name, i.recipient_id, i.issued_by, i.notes].some(s => s?.toLowerCase().includes(q))
        || (i.items ?? []).some(it => it.description.toLowerCase().includes(q) || (it.stock_code || '').toLowerCase().includes(q));
    });
  }, [issues, search, dateFrom, dateTo]);
  const rows = useMemo(() => sortRows(filtered, sort, (r, id) => (id === 'cost' ? issueCost(r) : id === 'items' ? (r.items ?? []).length : String(r[id as keyof StockIssue] ?? '').toLowerCase())), [filtered, sort]);
  const totalCost = useMemo(() => issues.reduce((s, i) => s + issueCost(i), 0), [issues]);

  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: filtered.length, transient: isTransientStatus(list.errorStatus) });
  const unavailable = !list.loaded && !list.loading;
  const hasFilters = !!search || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); };
  const s = stats.data;
  const statTile = { loading: stats.loading && !stats.loaded, unavailable: !stats.loaded && !stats.loading };

  const remove = async (i: StockIssue) => {
    if (!await confirm({ title: 'Delete this issue record?', message: `${i.recipient_name}, ${fmtDateTime(i.issued_at)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteIssue(i.id); setViewingId(null); toast.success('Issue record deleted.'); await refresh(); }
    catch (e) { toast.error(`The record was not deleted: ${(e as Error).message}`); }
  };
  const run = async (fn: () => Promise<void>, done: string) => { try { await fn(); toast.success(done); } catch (e) { toast.error(`Export failed: ${(e as Error).message}`); } };

  const COLUMNS: Column<StockIssue>[] = [
    { id: 'issued_at', header: 'Date and time', sortable: true, sticky: true, cell: i => <span className="whitespace-nowrap tabular">{fmtDateTime(i.issued_at)}</span> },
    { id: 'recipient_name', header: 'Issued to', sortable: true, cell: i => <div><p className="font-medium text-ink">{i.recipient_name}</p>{i.recipient_id && <p className="font-mono text-caption text-ink-muted">{i.recipient_id}</p>}</div> },
    { id: 'items', header: 'Items', sortable: true, cell: i => { const first = (i.items ?? [])[0]; return <div><p>{(i.items ?? []).length} {(i.items ?? []).length === 1 ? 'item' : 'items'}</p>{first && <p className="max-w-[16rem] truncate text-caption text-ink-muted">{first.stock_code && <span className="mr-1 font-mono">{first.stock_code}</span>}{first.description}{(i.items ?? []).length > 1 ? ' and more' : ''}</p>}</div>; } },
    { id: 'cost', header: 'Cost', sortable: true, numeric: true, cell: i => (hasPrice(i) ? <span className="tabular">{formatCurrency(issueCost(i))}</span> : <span className="text-ink-muted">No price</span>) },
    { id: 'issued_by', header: 'Issued by', sortable: true, hideBelow: 'md', cell: i => i.issued_by || <span className="text-ink-muted">Not recorded</span> },
    { id: 'notes', header: 'Notes', hideBelow: 'lg', cell: i => <span className="line-clamp-2 max-w-[16rem]">{i.notes || <span className="text-ink-muted">None</span>}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Inventory' }, { label: 'Stock issues' }]}
        title="Stock issues"
        description="Record the items issued to people, and look back over the cost."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh stock issues" variant="outline" pending={(list.loading && list.loaded) || (stats.loading && stats.loaded)} onClick={() => refresh()} />
            <Menu>
              <MenuTrigger asChild><Button icon="download" disabled={issues.length === 0}>Download</Button></MenuTrigger>
              <MenuContent>
                <MenuItem icon="download" onSelect={() => run(() => exportIssuesExcel(issues), `Excel exported, ${issues.length} issues.`)}>Excel (.xlsx)</MenuItem>
                <MenuItem icon="pdf" onSelect={() => run(() => exportIssuesPdf(issues), `PDF exported, ${issues.length} issues.`)}>PDF</MenuItem>
              </MenuContent>
            </Menu>
          </>
        )}
      />

      <div className="flex flex-col gap-3">
        <MetricGrid columns={5}>
          <MetricTile label="Total records" icon="documents" value={s?.total} {...statTile} />
          <MetricTile label="Today" icon="today" value={s?.today} {...statTile} />
          <MetricTile label="This week" icon="week" value={s?.this_week} {...statTile} />
          <MetricTile label="Recipients" icon="employees" value={s?.unique_recipients} {...statTile} />
          <MetricTile label="Total cost" icon="cost" value={list.loaded ? formatCurrencyShort(totalCost) : undefined} loading={list.loading && !list.loaded} unavailable={unavailable} />
        </MetricGrid>
        {stats.error && <Notice tone={stats.loaded ? 'warning' : 'danger'} title={stats.loaded ? 'Summary figures may be out of date' : 'Summary figures could not be loaded'} action={<Button size="sm" icon="refresh" onClick={() => stats.refetch()}>Try again</Button>}>{stats.error}</Notice>}
      </div>

      <IssueForm
        spares={spares.items}
        sparesError={spares.error && !spares.loaded ? spares.error : null}
        onRetrySpares={() => spares.refetch()}
        defaultIssuedBy={profile?.full_name || profile?.email || ''}
        onRecorded={refresh}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Stock issue sections">
          <TabsTrigger value="log" icon="issues">Issue log</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="mt-4 flex flex-col gap-4">
          <Toolbar filtered={hasFilters}>
            <SearchField value={search} onValueChange={setSearch} placeholder="Search recipient, item or notes" wrapperClassName="min-w-56 max-w-md flex-1" />
            <Input type="date" aria-label="From date" className="w-40" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <Input type="date" aria-label="To date" className="w-40" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            {hasFilters && <Button variant="ghost" icon="close" onClick={clearFilters}>Clear filters</Button>}
          </Toolbar>
          <DataRegion
            status={status} subject="stock issues" error={list.error} onRetry={() => refresh()}
            empty={hasFilters
              ? <EmptyState icon="search" title="No issue records match" description="Try a different search or dates." action={<Button onClick={clearFilters}>Clear filters</Button>} />
              : <EmptyState icon="issues" title="No issues recorded yet" description="Use the form above to record the first one." />}
          >
            <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}{filtered.length !== issues.length ? ` of ${issues.length}` : ''}</p>
            <DataTable
              caption="Stock issue log" rows={rows} columns={COLUMNS} getRowId={i => String(i.id)} sort={sort} onSortChange={setSort}
              onRowActivate={i => setViewingId(i.id)}
              rowActions={i => <IconButton icon="delete" variant="danger" size="sm" label={`Delete the issue to ${i.recipient_name} on ${fmtDateTime(i.issued_at)}`} onClick={() => remove(i)} />}
            />
          </DataRegion>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {list.loaded ? <AnalyticsPanel issues={issues} /> : <Notice tone={list.error ? 'danger' : 'info'} title={list.error ? 'The issue log could not be loaded' : 'Loading the issue log'} action={list.error ? <Button size="sm" icon="refresh" onClick={() => refresh()}>Try again</Button> : undefined}>{list.error ?? 'The analysis follows when the log has loaded.'}</Notice>}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!viewing} onOpenChange={o => { if (!o) setViewingId(null); }}
        title={viewing ? `Issue to ${viewing.recipient_name}` : 'Issue'} description={viewing ? fmtDateTime(viewing.issued_at) : undefined} size="lg"
        footer={viewing && (<><Button variant="danger" icon="delete" onClick={() => remove(viewing)}>Delete</Button><Button onClick={() => setViewingId(null)}>Close</Button></>)}
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">Issued by</dt><dd className="font-sans text-body text-ink">{viewing.issued_by || 'Not recorded'}</dd></div>
              <div className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">Recipient ID</dt><dd className="font-sans text-body text-ink">{viewing.recipient_id || 'Not recorded'}</dd></div>
            </dl>
            <ul className="flex flex-col gap-2" aria-label="Items issued">
              {(viewing.items ?? []).map((it, n) => (
                <li key={n} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-control border border-line bg-surface-subtle px-3 py-2 font-sans text-body-sm">
                  {it.stock_code && <span className="w-24 shrink-0 truncate font-mono font-semibold text-ink">{it.stock_code}</span>}
                  <span className="min-w-0 flex-1 text-ink [overflow-wrap:anywhere]">{it.description}</span>
                  <span className="tabular text-ink">{it.qty} {it.unit || 'UN'}</span>
                  {(it.unit_price || 0) > 0 ? <span className="tabular font-medium text-ink">{formatCurrency(lineTotal(it.qty, it.unit_price || 0))}</span> : <StatusBadge tone="neutral">No price</StatusBadge>}
                </li>
              ))}
            </ul>
            {issueCost(viewing) > 0 && <p className="text-right font-sans text-body text-ink-muted">Total <span className="font-semibold text-ink tabular">{formatCurrency(issueCost(viewing))}</span></p>}
            {viewing.notes && <p className="whitespace-pre-wrap rounded-control bg-surface-subtle p-3 font-sans text-body text-ink [overflow-wrap:anywhere]">{viewing.notes}</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}

export default function IssuesPage() {
  return <AppShell migrated><IssuesContent /></AppShell>;
}
