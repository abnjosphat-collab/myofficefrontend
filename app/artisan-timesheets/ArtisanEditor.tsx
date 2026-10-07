// app/artisan-timesheets/ArtisanEditor.tsx — one artisan's month: who and which month, the days (day cards or the quick-view
// table), and the four approvals (register name and signature) at the foot, with refresh-from-the-system, the Excel and PDF
// downloads and Save. Hours come from the system and are read-only; the person sets standby, signs in and out, and adds notes.
// What stops a save is listed above the days; a refused save stays here with its reason.
'use client';

import { useMemo } from 'react';
import { Button, Combobox, Field, Notice, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, usePersistentState } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { getCompiledBySignatureReuse } from './collectTimesheetSignatures';
import { DayCards } from './DayCards';
import { QuickView } from './QuickView';
import { periodLabel, type Sources } from './artisanLogic';
import { SignatureField } from '@/components/shared/SignatureField';
import type { ArtisanTimesheetDraft } from './types';

type NameKey = 'compiled_by' | 'approved_electrical_foreman' | 'approved_mechanical_foreman' | 'authorized_by';
const APPROVALS: { label: string; name: NameKey; sig: `${NameKey}_signature` }[] = [
  { label: 'Compiled by', name: 'compiled_by', sig: 'compiled_by_signature' },
  { label: 'Approved by the electrical foreman', name: 'approved_electrical_foreman', sig: 'approved_electrical_foreman_signature' },
  { label: 'Approved by the mechanical foreman', name: 'approved_mechanical_foreman', sig: 'approved_mechanical_foreman_signature' },
  { label: 'Authorized by', name: 'authorized_by', sig: 'authorized_by_signature' },
];

export function ArtisanEditor({ draft, onChange, saved, dirty, blocked, sourcesFailed, saveError, saving, exporting, sources, onRefresh, onSave, onExport }: {
  draft: ArtisanTimesheetDraft; onChange: (d: ArtisanTimesheetDraft) => void; saved: boolean; dirty: boolean; blocked: string[]; sourcesFailed: string[]; saveError: string | null; sources: Sources;
  saving: boolean; exporting: 'excel' | 'pdf' | null; onRefresh: () => void; onSave: () => void; onExport: (format: 'excel' | 'pdf') => void;
}) {
  const reuse = getCompiledBySignatureReuse(draft.compiled_by_signature);
  const set = (patch: Partial<ArtisanTimesheetDraft>) => onChange({ ...draft, ...patch });
  const [daysView, setDaysView] = usePersistentState<'cards' | 'quick'>('myoffice_artisan_dayview_v2', 'quick', raw => (raw === 'cards' || raw === 'quick' ? raw : undefined));
  // Sign-off names come strictly from the employee register (same dedupe as PersonInput); a legacy free-typed name on an
  // old save is kept as a one-off option so it still shows until someone reselects.
  const employees = useEmployees();
  const registerNames = useMemo(() => {
    const seen = new Set<string>();
    return employees.map(e => (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim()).filter(n => n && !seen.has(n) && !!seen.add(n)).sort();
  }, [employees]);
  const optionsFor = (current: string) => {
    const base = registerNames.map(n => ({ value: n, label: n }));
    return current && !registerNames.includes(current) ? [{ value: current, label: current }, ...base] : base;
  };
  return (
    <div className="flex flex-col gap-4">
      <section aria-label="This timesheet" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-title font-semibold text-ink">{draft.employee_name}, {periodLabel(draft.year, draft.month)}</h2>
          <StatusBadge tone={dirty ? 'warning' : saved ? 'success' : 'neutral'}>{dirty ? 'Unsaved changes' : saved ? 'Saved' : 'Not saved yet'}</StatusBadge>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {([['Mine number', draft.employee_id], ['ID number', draft.id_number], ['Month', periodLabel(draft.year, draft.month)]] as const).map(([k, v]) => (
            <div key={k} className="rounded-control bg-surface-subtle p-3"><dt className="font-sans text-caption text-ink-muted">{k}</dt><dd className="font-sans text-body text-ink [overflow-wrap:anywhere]">{v || 'Not recorded'}</dd></div>
          ))}
        </dl>
      </section>

      {sourcesFailed.length > 0 && <Notice tone="warning" title="Part of the system data could not be loaded">The month was filled without {sourcesFailed.join(', ')}, so those days are not marked. Reload the page and use Refresh from the system to fill them in.</Notice>}
      {blocked.length > 0 && <Notice tone="danger" title="Fix these before saving"><span className="flex flex-col gap-0.5">{blocked.slice(0, 8).map(b => <span key={b}>{b}</span>)}{blocked.length > 8 && <span>and {blocked.length - 8} more.</span>}</span></Notice>}
      {saveError && <Notice tone="danger" title="The timesheet was not saved">{saveError}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-subtle px-4 py-2.5">
        <p className="max-w-3xl font-sans text-caption text-ink-muted">Days marked with a dot were filled from leave, overtime, standby and public holidays. Hours come from the system — set standby, sign in and out, and add notes. Shifts run 07:00 to 07:00.</p>
        <Button icon="refresh" onClick={onRefresh}>Refresh from the system</Button>
      </div>

      <Tabs value={daysView} onValueChange={v => setDaysView(v === 'quick' ? 'quick' : 'cards')}>
        <TabsList aria-label="How the days are shown">
          <TabsTrigger value="cards" icon="grid-view">Day cards</TabsTrigger>
          <TabsTrigger value="quick" icon="table-view">Quick view</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" className="mt-4">
          <DayCards rows={draft.daily_rows} employeeName={draft.employee_name} employeeMineNo={draft.employee_id} sources={sources} year={draft.year} month={draft.month} reuseSignatures={reuse} onChange={rows => set({ daily_rows: rows })} />
        </TabsContent>
        <TabsContent value="quick" className="mt-4">
          <QuickView rows={draft.daily_rows} employeeMineNo={draft.employee_id} sources={sources} onChange={rows => set({ daily_rows: rows })} />
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {APPROVALS.map(a => (
          <section key={a.name} aria-label={a.label} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
            <Field label={a.label} optional><Combobox aria-label={a.label} value={draft[a.name]} onValueChange={v => set({ [a.name]: v })} options={optionsFor(draft[a.name])} placeholder="Select from the register" clearLabel="None" /></Field>
            <div className="flex flex-col gap-1"><span className="font-sans text-caption text-ink-muted">Signature</span><SignatureField label={`${a.label}, signature`} signerName={draft[a.name] || draft.employee_name} value={draft[a.sig]} onChange={v => set({ [a.sig]: v })} /></div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button icon="download" pending={exporting === 'excel'} disabled={!!exporting} onClick={() => onExport('excel')}>Download Excel</Button>
        <Button icon="pdf" pending={exporting === 'pdf'} disabled={!!exporting} onClick={() => onExport('pdf')}>Download PDF</Button>
        <Button variant="primary" icon="save" pending={saving} onClick={onSave}>{saved ? 'Update timesheet' : 'Save timesheet'}</Button>
      </div>
    </div>
  );
}
