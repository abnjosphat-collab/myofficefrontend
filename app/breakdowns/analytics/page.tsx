// app/breakdowns/analytics/page.tsx — breakdown analytics on a page of their own: pick a date range, a department or one machine, and
// apply. The same views as the Analytics tab on the Breakdowns page, counted by the server from the breakdown records.
'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { Button, Field, Input, PageHeader, Toolbar } from '@/components/ui-system';
import { InsightsPanel } from '../insights/InsightsPanel';
import { insightQuery, type InsightFilters } from '../useBreakdownsData';

const NONE = { from: '', to: '', department: '', machineId: '' };

function AnalyticsContent() {
  const [draft, setDraft] = useState(NONE);
  const [applied, setApplied] = useState<InsightFilters>(NONE);
  const [refresh, setRefresh] = useState(0);
  const filtered = Object.values(applied).some(Boolean);
  const apply = (e: FormEvent) => { e.preventDefault(); setApplied({ ...draft, department: draft.department.trim(), machineId: draft.machineId.trim() }); };
  const clear = () => { setDraft(NONE); setApplied(NONE); };
  const badRange = !!draft.from && !!draft.to && draft.from > draft.to;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Breakdowns', href: '/breakdowns' }, { label: 'Analytics' }]}
        title="Breakdown analytics"
        description="Where, when and how often machines fail, and what it costs."
        actions={<Button asChild icon="back"><Link href="/breakdowns">Back to the breakdowns</Link></Button>}
      />
      <form onSubmit={apply} aria-label="Analytics filters">
        <Toolbar filtered={filtered}>
          <Field label="From" className="w-40"><Input type="date" value={draft.from} onChange={e => setDraft(d => ({ ...d, from: e.target.value }))} /></Field>
          <Field label="To" className="w-40" error={badRange ? 'The end is before the start.' : undefined}><Input type="date" value={draft.to} onChange={e => setDraft(d => ({ ...d, to: e.target.value }))} /></Field>
          <Field label="Department" className="w-48"><Input value={draft.department} onChange={e => setDraft(d => ({ ...d, department: e.target.value }))} placeholder="Any department" /></Field>
          <Field label="Machine ID" className="w-44"><Input value={draft.machineId} onChange={e => setDraft(d => ({ ...d, machineId: e.target.value }))} placeholder="Any machine" /></Field>
          <Button type="submit" variant="primary" disabled={badRange}>Apply</Button>
          {filtered && <Button variant="ghost" icon="close" onClick={clear}>Clear filters</Button>}
          <Button icon="refresh" onClick={() => setRefresh(n => n + 1)}>Refresh</Button>
        </Toolbar>
      </form>
      <InsightsPanel key={refresh} query={insightQuery(applied)} />
    </div>
  );
}

export default function BreakdownAnalyticsPage() {
  return <AppShell migrated><AnalyticsContent /></AppShell>;
}
