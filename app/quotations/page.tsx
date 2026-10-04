// app/quotations/page.tsx — a quotation generator: type the company, the client and the lines, see the document, and export it as a PDF
// or a Word file. It runs entirely in this browser: the draft, your company details and the quotations you save are kept here, and
// nothing is sent to a server or by email. Nothing is pre-filled.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, EmptyState, MetricGrid, MetricTile, Notice, PageHeader, Skeleton, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, useConfirm, usePersistentState,
} from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { exportPdf, exportWord } from './exportQuotation';
import { QuotationPreview } from './QuotationPreview';
import { ClientPanel, CompanyPanel, DetailsPanel, LineItems, Section, TextPanels } from './QuotationPanels';
import { blankCompany, blankDraft, clientLabel, money, problems, readCompany, readDraft, readSaved, totalsOf, usedLines, type Company, type Draft, type Saved } from './quotationLogic';

const MAX_SAVED = 50;

function QuotationsContent() {
  const confirm = useConfirm();
  const [stored, setStored, ready] = usePersistentState<Draft | null>('myoffice_quotation_draft', null, raw => (raw === null ? null : readDraft(raw)));
  const [company, setCompany] = usePersistentState<Company>('myoffice_quotation_company', blankCompany(), readCompany);
  const [saved, setSaved] = usePersistentState<Saved[]>('myoffice_quotations_saved', [], readSaved);
  const fresh = useMemo(() => blankDraft(new Date()), []);
  const draft = stored ?? fresh;
  const [tab, setTab] = useState('edit');
  const [busy, setBusy] = useState<'pdf' | 'word' | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const update = (patch: Partial<Draft>) => { setStored({ ...draft, ...patch }); setBlocked([]); };
  const totals = totalsOf(draft);
  const used = usedLines(draft).length;
  const recent = useMemo(() => { const seen = new Map<string, { label: string; party: Draft['client'] }>(); saved.forEach(s => { const label = clientLabel(s.draft.client); if (label !== 'No client' && !seen.has(label)) seen.set(label, { label, party: s.draft.client }); }); return [...seen.values()].slice(0, 6).map(v => ({ label: v.label, party: v.party })); }, [saved]);

  const run = async (kind: 'pdf' | 'word') => {
    const p = problems(draft);
    if (p.length) { setBlocked(p); toast.error('The quotation is not ready to export.'); return; }
    setBusy(kind);
    try { const name = await (kind === 'pdf' ? exportPdf(draft, company) : exportWord(draft, company)); toast.success(`${name} saved to your downloads.`); }
    catch (e) { toast.error(`The ${kind === 'pdf' ? 'PDF' : 'Word file'} could not be made: ${(e as Error).message}`); }
    finally { setBusy(null); }
  };
  const save = () => {
    const entry: Saved = { id: draft.number || String(Date.now()), savedAt: new Date().toISOString(), draft };
    const others = saved.filter(s => s.id !== entry.id);
    setSaved([entry, ...others].slice(0, MAX_SAVED));
    toast.success(others.length === saved.length ? `${entry.id} saved in this browser.` : `${entry.id} updated in this browser.`);
  };
  const startNew = async () => {
    const dirty = usedLines(draft).length > 0 || draft.client.name || draft.client.company;
    if (dirty && !await confirm({ title: 'Start a new quotation?', message: 'The current draft is cleared. Save it first if you want to come back to it.', confirmLabel: 'Start new', destructive: true })) return;
    setStored(blankDraft(new Date())); setBlocked([]); setTab('edit');
  };
  const load = (s: Saved) => { setStored(s.draft); setBlocked([]); setTab('edit'); toast.success(`${s.id} loaded.`); };
  const remove = async (s: Saved) => {
    if (!await confirm({ title: 'Delete this saved quotation?', message: `${s.id}, ${clientLabel(s.draft.client)}. It is removed from this browser only.`, confirmLabel: 'Delete', destructive: true })) return;
    setSaved(saved.filter(x => x.id !== s.id)); toast.success(`${s.id} deleted.`);
  };

  if (!ready) return <div className="flex flex-col gap-6" aria-busy="true"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'Quotations' }]}
        title="Quotation generator"
        description="Write a quotation and export it as a PDF or Word file."
        actions={(
          <>
            <Button icon="plus" onClick={startNew}>New</Button>
            <Button icon="save" onClick={save}>Save</Button>
            <Button icon="download" pending={busy === 'word'} disabled={busy !== null} onClick={() => run('word')}>Word</Button>
            <Button variant="primary" icon="pdf" pending={busy === 'pdf'} disabled={busy !== null} onClick={() => run('pdf')}>PDF</Button>
          </>
        )}
      />
      <Notice tone="info" title="Kept in this browser">Your draft, your company details and the quotations you save stay on this device. Nothing is sent to a server, and the page cannot email a quotation: export it and send the file yourself.</Notice>
      {blocked.length > 0 && <Notice tone="danger" title="Fix these before exporting"><span className="flex flex-col gap-0.5">{blocked.map(b => <span key={b}>{b}</span>)}</span></Notice>}

      <MetricGrid columns={4}>
        <MetricTile label="Line items" icon="documents" value={used} />
        <MetricTile label="Subtotal" icon="cost" value={money(totals.subtotal, draft.currency)} />
        <MetricTile label="Total" icon="value" value={money(totals.total, draft.currency)} detail={`Tax ${Number(draft.taxRate) || 0}%, discount ${Number(draft.discount) || 0}%`} />
        <MetricTile label="Valid until" icon="calendar" value={draft.validUntil ? fmtDate(draft.validUntil) : 'Not set'} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Quotation views">
          <TabsTrigger value="edit" icon="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview" icon="eye">Preview</TabsTrigger>
          <TabsTrigger value="saved" icon="archive">{`Saved (${saved.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <DetailsPanel draft={draft} onChange={update} />
              <ClientPanel client={draft.client} onChange={client => update({ client })} recent={recent} />
              <CompanyPanel company={company} onChange={setCompany} />
            </div>
            <div className="flex flex-col gap-4">
              <LineItems lines={draft.lines} currency={draft.currency} onChange={lines => update({ lines })} />
              <TextPanels draft={draft} onChange={update} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4"><QuotationPreview draft={draft} company={company} /></TabsContent>

        <TabsContent value="saved" className="mt-4">
          {saved.length === 0
            ? <EmptyState icon="archive" title="Nothing saved yet" description="Choose Save to keep a copy of this quotation in this browser, to open again later." action={<Button icon="save" onClick={save}>Save this quotation</Button>} />
            : (
              <Section title="Saved in this browser" description={`The ${MAX_SAVED} most recent are kept.`}>
                <ul className="flex flex-col divide-y divide-line-subtle" aria-label="Saved quotations">
                  {saved.map(s => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1"><p className="font-sans text-label font-semibold text-ink [overflow-wrap:anywhere]">{s.id} <span className="font-normal text-ink-muted">{clientLabel(s.draft.client)}</span></p><p className="font-sans text-caption text-ink-muted">Saved {s.savedAt ? fmtDate(s.savedAt) : ''}, {usedLines(s.draft).length} {usedLines(s.draft).length === 1 ? 'line' : 'lines'}</p></div>
                      <StatusBadge tone="neutral">{money(totalsOf(s.draft).total, s.draft.currency)}</StatusBadge>
                      <Button size="sm" onClick={() => load(s)}>Open</Button>
                      <Button size="sm" variant="ghost" icon="delete" aria-label={`Delete ${s.id}`} onClick={() => remove(s)} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function QuotationsPage() {
  return <AppShell migrated><QuotationsContent /></AppShell>;
}
